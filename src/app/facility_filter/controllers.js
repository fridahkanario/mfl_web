(function (angular, _) {
    "use strict";

    angular.module("mfl.facility_filter.controllers", [
        "mfl.facility_filter.services",
        "mfl.facility_filter.states"
    ])

    .controller("mfl.facility_filter.controllers.form",
        ["$stateParams", "$scope", "$state", "$location",
        "mfl.facility_filter.services.wrappers", "URL_SEARCH_PARAMS",
        function ($stateParams, $scope, $state, $location, wrappers, URL_SEARCH_PARAMS) {
            $scope.filters = {
                single: {
                    name: "",
                    code: "",
                    search: "",
                    number_of_beds: "",
                    number_of_cots: "",
                    open_public_holidays: true,
                    open_weekends: true,
                    open_whole_day: true
                },
                multiple: {
                    county: [],
                    facility_type: [],
                    constituency: [],
                    ward: [],
                    operation_status: [],
                    service_category: [],
                    owner_type: [],
                    owner: [],
                    service: []
                }
            };

            var updateSelectFilters = function (params, filter_summaries) {
                // update text inputs
                _.each(["name", "code", "search", "number_of_cots", "number_of_beds"],
                    function (a) {
                        $scope.filters.single[a] = params[a] || "";
                    }
                );
                // update bool inputs
                _.each(["open_weekends", "open_whole_day", "open_public_holidays"],
                    function (a) {
                        var val = params[a];
                        $scope.filters.single[a] = (val !== "false");
                    }
                );
                // update ui-select inputs
                _.each(_.keys($scope.filters.multiple),
                    function (a) {
                        var val = params[a];
                        if (val) {
                            $scope.filters.multiple[a] = _.filter(
                                filter_summaries[a],
                                function (b) {
                                    return val.indexOf(b.id) !== -1;
                                }
                            );
                        }
                    }
                );

                // TODO : update ui-select with relationships
            };

            $scope.filterFxns = {
                constFilter: function (a) {
                    var county_ids = _.pluck($scope.filters.multiple.county, "id");
                    return _.contains(county_ids, a.county);
                },
                wardFilter: function (a) {
                    var const_ids = _.pluck($scope.filters.multiple.constituency, "id");
                    return _.contains(const_ids, a.constituency);
                },
                ownerFilter: function (a) {
                    var owner_types = _.pluck($scope.filters.multiple.owner_type, "id");
                    return (_.isEmpty(owner_types)) ?
                        true :
                        _.contains(owner_types, a.owner_type);
                },
                serviceFilter: function (a) {
                    var categories = _.pluck($scope.filters.multiple.service_category, "id");
                    return (_.isEmpty(categories)) ?
                        true :
                        _.contains(categories, a.category);
                }
            };

            wrappers.filters.filter({"fields": ["county", "facility_type",
                "constituency", "ward", "operation_status", "service_category",
                "owner_type", "owner", "service"
            ]})
            .success(function (data) {
                $scope.filter_summaries = data;
                updateSelectFilters($stateParams, data);
            });

            var dumpMultipleFilters = function (src) {
                return _.reduce(_.keys(src), function (memo, b) {
                    memo[b] = _.pluck(src[b], "id").join(",");
                    return memo;
                }, {});
            };

            var dumpSingleFilters = function (src) {
                var k = _.keys(src);
                return _.reduce(k, function (memo, b) {
                    memo[b] = src[b];
                    return memo;
                }, {});
            };

            $scope.filterFacilities = function () {
                var multiple = dumpMultipleFilters($scope.filters.multiple);
                var single = dumpSingleFilters($scope.filters.single);
                var params = _.extend(single, multiple);
                params.page = undefined;
                params.page_size = undefined;
                $state.go("facility_filter.results", params);
            };

            $scope.clearFilters = function () {
                var params = {};
                _.each(URL_SEARCH_PARAMS, function (a) {
                    params[a] = undefined;
                });
                // TODO : cancel filter_promise defined in L120
                $state.go("facility_filter", params);
            };
        }]
    )

    .controller("mfl.facility_filter.controllers.results",
        ["$scope", "$state", "$window", "filterParams",
        "mfl.facility_filter.services.wrappers", "api.auth",
        function ($scope, $state, $window, filterParams, wrappers, auth) {
            var filter_keys = _.keys(filterParams);
            var params = _.reduce(filter_keys, function (memo, b) {
                if (filterParams[b]) {
                    memo[b] = filterParams[b];
                }
                return memo;
            }, {});

            $scope.spinner = true;
            $scope.filter_promise = wrappers.facilities.filter(params)
            .success(function (data) {
                $scope.spinner = false;
                $scope.results = data;
            })
            .error(function (e) {
                $scope.alert = e.detail ||
                               "Sorry, a server connection error occured.";
                $scope.spinner = false;
            });

            $scope.excelExport = function () {
                var download_params = {
                    "format": "excel",
                    "access_token": auth.getToken().access_token,
                    "page_size": $scope.results.count
                };
                _.extend(download_params, _.omit(params, "page"));

                var helpers = wrappers.helpers;
                var url = helpers.joinUrl([
                    wrappers.facilities.makeUrl(wrappers.facilities.apiBaseUrl),
                    helpers.makeGetParam(helpers.makeParams(download_params))
                ]);

                $window.location.href = url;
            };

            $scope.nextPage = function () {
                if ($scope.results.total_pages === $scope.results.current_page) {
                    return;
                }
                params.page = $scope.results.current_page + 1 ;
                $state.go("facility_filter.results", params);
            };

            $scope.prevPage = function () {
                if ($scope.results.current_page === 1) {
                    return;
                }
                params.page = $scope.results.current_page - 1;
                $state.go("facility_filter.results", params);
            };
        }]
    );

})(angular, _);
