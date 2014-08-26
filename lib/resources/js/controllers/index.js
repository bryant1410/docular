angular.module('docular.controllers', [
    'docular.services',
    'docular.directives'
])
    .controller('AppController', ['$scope', 'documentation', 'dataFilter', 'pageData', '$interval', function ($scope, documentationService, dataFilter, pageData, $interval) {
        $scope.allDocuments = documentationService.getAllDocuments();
        $scope.pageData = pageData;
        
        $scope.createBreadcrumbs = function (items) {
            var crumbs = [];
            
            for(var i = 0, l = items.length; i < l; i++) {
                crumbs.push({
                    title: items[i].groupTitle || items[i].title,
                    path: items[i].path
                });
            }
            pageData.breadcrumbs = crumbs;
        };
        
        $scope.addBreadcrumb = function (crumb) {
            pageData.breadcrumbs.push({
                title: crumb.groupTitle || crumb.title,
                path: crumb.path
            });
        };
    }])
    .controller('IndexPageController', [
            '$scope', 'group', 'documents', 'dataFilter', '$route', 'pageData', 'config',
            function ($scope, group, documents, dataFilter, $route, pageData, config) {
        
        $scope.group = group;
        $scope.groups = group.groups;
        $scope.groupId = group.groupId;
        $scope.documents = documents;
        $scope.dataFilter = dataFilter;
        
        $scope.toggleItem = function (id) {
            localStorage.setItem('toggle-' + id, JSON.stringify(!$scope.getItemToggleStatus(id)));
        };
        $scope.getItemToggleStatus = function (id) {
            var r = JSON.parse(localStorage.getItem('toggle-' + id));
            return r === null ? true : r;
        };
        
        var documentationItem;
        if($route.current.params.name) {
            documentationItem = dataFilter(documents, {name: $route.current.params.name, root: $route.current.params.root});
            if(!documentationItem.length) {
                documentationItem = dataFilter(documents, {name: $route.current.params.name});
            }
            if(documentationItem.length) {
                if(documentationItem.length > 1) { console.warn("Found multiple for ", $route.current.params.name); }
                documentationItem = documentationItem[0];
            } else {
                documentationItem = null;
            }
            console.log(documentationItem);
        }
        
        pageData.title = documentationItem ? documentationItem.name : group.title;
        
        $scope.documentationItem = documentationItem;
        if(!documentationItem) {
            $scope.isIndex = true;
        } else {
            $scope.includeUrl = 'resources/plugins/' + documentationItem.handler + '/documentationPartial.html';
        }
        $scope.fetchDocumentItems = function (module) {
            var searchCrit = {level: 1, root: module.id};
            if($scope.search) {
                searchCrit.search = {op: 'ilike', val: $scope.search};
            }
            var items = dataFilter(documents, searchCrit);
            var itemGroups = [], itemGroupIndexes = {};
            for(var i = 0, l = items.length; i < l; i++) {
                var item = items[i];
                if(itemGroupIndexes[item.type] === undefined) {
                    itemGroupIndexes[item.type] = itemGroups.length;
                    itemGroups.push({
                        type: item.type,
                        items: []
                    });
                }
                itemGroups[itemGroupIndexes[item.type]].items.push(item);
            }
            itemGroups = itemGroups.sort(function (a, b) {
                if(a.type > b.type) {
                    return 1;
                } else if (a.type < b.type) {
                    return -1;
                }
                return 0;
            });
            return itemGroups;
        };
        
        function setupNav() {
            $scope.sortedDocuments = {};
            $scope.rootLevelDocs = [];
            var rootLevelDocs = dataFilter(documents, {level: 0});
            for(var i = 0, l = rootLevelDocs.length; i < l; i++) {
                var docs = $scope.fetchDocumentItems(rootLevelDocs[i]);
                if(docs.length > 0) {
                    $scope.sortedDocuments[rootLevelDocs[i].id] = docs;
                    $scope.rootLevelDocs.push(rootLevelDocs[i]);
                }
            }
        }
        
        function spider(group, path, results) {
            if(group.path === path) {
                return group;
            } else if (group.groups) {
                for(var i = 0, l = group.groups.length; i < l; i++) {
                    var result = spider(group.groups[i], path, results);
                    if(result) {
                        results.push(result);
                        return group;
                    }
                }
            } else {
                return false;
            }
        }
        var results = [];
        spider(config, group.path, results);
        results = results.reverse();
        
        
        $scope.createBreadcrumbs(results.map(function (item) {
            return {
                title: item.groupTitle,
                path: '#/documentation/' + item.path + '/index'
            }
        }));
        
        if(documentationItem) {
            var parentItem = dataFilter(documents, {
                level: {op: 'lt', val: documentationItem.level},
                right: {op: 'gt', val: documentationItem.right},
                left: {op: 'lt', val: documentationItem.left},
                root: documentationItem.root
            });
            if(parentItem.length > 0) {
                $scope.addBreadcrumb({
                    title: parentItem[0].name,
                    path: '#/documentation/' + group.path + '/docApi/' + parentItem[0].root + '/' + parentItem[0].id
                });
            }
            $scope.addBreadcrumb({
                title: documentationItem.name
            });
        }
        
        setupNav();
        $scope.$watch('search', setupNav);
        
    }]);