// Copyright (C) 2007-2014, GoodData(R) Corporation. All rights reserved.
/* eslint func-names:0 handle-callback-err: 0 */
import * as ex from '../src/execution';
import cloneDeep from 'lodash/lang/cloneDeep';
import { expectColumns, expectMetricDefinition, expectWhereCondition } from './helpers/execution';

describe('execution', () => {
    describe('with fake server', () => {
        let server;
        let serverResponseMock;

        beforeEach(function() {
            server = sinon.fakeServer.create();
            server.autoRespond = true;
        });

        afterEach(function() {
            server.restore();
        });

        describe('Data Execution:', () => {
            beforeEach(function() {
                serverResponseMock = {
                    executionResult: {
                        columns: [
                            {
                                attributeDisplayForm: {
                                    meta: {
                                        identifier: 'attrId',
                                        uri: 'attrUri',
                                        title: 'Df Title'
                                    }
                                }
                            },
                            {
                                metric: {
                                    meta: {
                                        identifier: 'metricId',
                                        uri: 'metricUri',
                                        title: 'Metric Title'
                                    },
                                    content: {
                                        format: '#00'
                                    }
                                }
                            }
                        ],
                        tabularDataResult: '/gdc/internal/projects/myFakeProjectId/experimental/executions/23452345'
                    }
                };
            });

            describe('getData', () => {
                it('should resolve with JSON with correct data without headers', done => {
                    server.respondWith(
                        '/gdc/internal/projects/myFakeProjectId/experimental/executions',
                        [200, {'Content-Type': 'application/json'},
                        JSON.stringify(serverResponseMock)]
                    );
                    server.respondWith(
                        /\/gdc\/internal\/projects\/myFakeProjectId\/experimental\/executions\/(\w+)/,
                        [201, {'Content-Type': 'application/json'},
                        JSON.stringify({'tabularDataResult': {values: ['a', 1]}})]
                    );

                    ex.getData('myFakeProjectId', ['attrId', 'metricId']).then(function(result) {
                        expect(result.headers[0].id).to.be('attrId');
                        expect(result.headers[0].uri).to.be('attrUri');
                        expect(result.headers[0].type).to.be('attrLabel');
                        expect(result.headers[0].title).to.be('Df Title');
                        expect(result.headers[1].id).to.be('metricId');
                        expect(result.headers[1].uri).to.be('metricUri');
                        expect(result.headers[1].type).to.be('metric');
                        expect(result.headers[1].title).to.be('Metric Title');
                        expect(result.rawData[0]).to.be('a');
                        expect(result.rawData[1]).to.be(1);
                        done();
                    }, function() {
                        expect().fail('Should resolve with CSV data');
                        done();
                    });
                });

                it('should resolve with JSON with correct data including headers', done => {
                    const responseMock = JSON.parse(JSON.stringify(serverResponseMock));

                    responseMock.executionResult.headers = [
                        {
                            id: 'attrId',
                            title: 'Atribute Title',
                            type: 'attrLabel',
                            uri: 'attrUri'
                        },
                        {
                            id: 'metricId',
                            title: 'Metric Title',
                            type: 'metric',
                            uri: 'metricUri'
                        }
                    ];

                    server.respondWith(
                        '/gdc/internal/projects/myFakeProjectId/experimental/executions',
                        [200, {'Content-Type': 'application/json'},
                        JSON.stringify(responseMock)]
                    );
                    server.respondWith(
                        /\/gdc\/internal\/projects\/myFakeProjectId\/experimental\/executions\/(\w+)/,
                        [201, {'Content-Type': 'application/json'},
                        JSON.stringify({'tabularDataResult': {values: ['a', 1]}})]
                    );

                    ex.getData('myFakeProjectId', ['attrId', 'metricId']).then(function(result) {
                        expect(result.headers[0].id).to.be('attrId');
                        expect(result.headers[0].uri).to.be('attrUri');
                        expect(result.headers[0].type).to.be('attrLabel');
                        expect(result.headers[0].title).to.be('Atribute Title');
                        expect(result.headers[1].id).to.be('metricId');
                        expect(result.headers[1].uri).to.be('metricUri');
                        expect(result.headers[1].type).to.be('metric');
                        expect(result.headers[1].title).to.be('Metric Title');
                        expect(result.rawData[0]).to.be('a');
                        expect(result.rawData[1]).to.be(1);
                        done();
                    }, function() {
                        expect().fail('Should resolve with CSV data');
                        done();
                    });
                });

                it('should not fail if tabular data result is missing', done => {
                    server.respondWith(
                        '/gdc/internal/projects/myFakeProjectId/experimental/executions',
                        [200, {'Content-Type': 'application/json'},
                        JSON.stringify(serverResponseMock)]
                    );
                    server.respondWith(
                        /\/gdc\/internal\/projects\/myFakeProjectId\/experimental\/executions\/(\w+)/,
                        [204, {'Content-Type': 'application/json'}, '']
                    );

                    ex.getData('myFakeProjectId', ['attrId', 'metricId']).then(function(result) {
                        expect(result.rawData).to.eql([]);
                        expect(result.isEmpty).to.be(true);
                        done();
                    }, function() {
                        expect().fail('Should resolve with empty data');
                        done();
                    });
                });

                it('should reject when execution fails', done => {
                    server.respondWith(
                        '/gdc/internal/projects/myFakeProjectId/experimental/executions',
                        [400, {'Content-Type': 'application/json'}, JSON.stringify({'reportDefinition': {'meta': {'uri': '/foo/bar/baz'}}})]
                    );

                    ex.getData('myFakeProjectId', ['attrId', 'metricId']).then(function() {
                        expect().fail('Should reject with 400');
                        done();
                    }, function(err) {
                        expect(err.status).to.be(400);
                        done();
                    });
                });

                it('should reject with 400 when data result fails', done => {
                    server.respondWith(
                        '/gdc/internal/projects/myFakeProjectId/experimental/executions',
                        [200, {'Content-Type': 'application/json'},
                        JSON.stringify(serverResponseMock)]
                    );
                    server.respondWith(
                        /\/gdc\/internal\/projects\/myFakeProjectId\/experimental\/executions\/(\w+)/,
                        [400, {'Content-Type': 'application/json'},
                        JSON.stringify({'tabularDataResult': {values: ['a', 1]}})]
                    );

                    ex.getData('myFakeProjectId', [{type: 'metric', uri: '/metric/uri'}]).then(function() {
                        expect().fail('Should reject with 400');
                        done();
                    }, function(err) {
                        expect(err.status).to.be(400);
                        done();
                    });
                });
            });

            describe('getData with execution context filters', () => {
                it('should propagate execution context filters to the server call', () => {
                    // prepare filters and then use them with getData
                    const filters = [{
                        'uri': '/gdc/md/myFakeProjectId/obj/1',
                        'constraint': {
                            'type': 'list',
                            'elements': ['/gdc/md/myFakeProjectId/obj/1/elements?id=1']
                        }
                    }];
                    ex.getData('myFakeProjectId', ['attrId', 'metricId'], {
                        filters: filters
                    });
                    const request = server.requests[0];
                    const requestBody = JSON.parse(request.requestBody);

                    expect(requestBody.execution.filters).to.eql(filters);
                });
            });

            describe('getData with order', () => {
                it('should propagate orderBy to server call', () => {
                    const orderBy = [
                        {
                            column: 'column1',
                            direction: 'asc'
                        },
                        {
                            column: 'column2',
                            direction: 'desc'
                        }
                    ];
                    let request;
                    let requestBody;

                    ex.getData('myFakeProjectId', ['attrId', 'metricId'], {
                        orderBy: orderBy
                    });

                    request = server.requests[0];
                    requestBody = JSON.parse(request.requestBody);
                    expect(requestBody.execution.orderBy).to.eql(orderBy);
                });
            });

            describe('getData with definitions', () => {
                it('should propagate orderBy to server call', () => {
                    const definitions = [
                        {
                            metricDefinition: {
                                'title': 'Closed Pipeline - previous year',
                                'expression': 'SELECT (SELECT {adyRSiRTdnMD}) FOR PREVIOUS ({date.year})',
                                'format': '#,,.00M',
                                'identifier': 'adyRSiRTdnMD.generated.pop.1fac4f897bbb5994a257cd2c9f0a81a4'
                            }
                        }
                    ];
                    ex.getData('myFakeProjectId', ['attrId', 'metricId'], {
                        definitions: definitions
                    });

                    /*eslint-disable vars-on-top*/
                    const request = server.requests[0];
                    const requestBody = JSON.parse(request.requestBody);
                    /*eslint-enable vars-on-top*/
                    expect(requestBody.execution.definitions).to.eql(definitions);
                });
            });

            describe('getData with query language filters', () => {
                it('should propagate filters to the server call', () => {
                    // prepare filters and then use them with getData
                    const where = {
                        'label.attr.city': { '$eq': 1 }
                    };
                    ex.getData('myFakeProjectId', ['attrId', 'metricId'], {
                        where: where
                    });
                    /*eslint-disable vars-on-top*/
                    const request = server.requests[0];
                    const requestBody = JSON.parse(request.requestBody);
                    /*eslint-enable vars-on-top*/

                    expect(requestBody.execution.where).to.eql(where);
                });
            });
        });

        describe('Execution with MD object', () => {
            let mdObj;
            beforeEach(() => {
                mdObj = {
                    'measures': [
                        {
                            'measure': {
                                'type': 'fact',
                                'aggregation': 'sum',
                                'objectUri': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1144',
                                'title': 'Sum of Amount',
                                'format': '#,##0.00',
                                'metricAttributeFilters': [
                                    {
                                        'listAttributeFilter': {
                                            'attribute': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/949',
                                            'displayForm': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/952',
                                            'default': {
                                                'negativeSelection': false,
                                                'attributeElements': [
                                                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/949/elements?id=168284',
                                                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/949/elements?id=168282'
                                                ]
                                            }
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            'measure': {
                                'type': 'attribute',
                                'aggregation': 'count',
                                'objectUri': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1244',
                                'title': 'Count of Activity',
                                'format': '#,##0.00',
                                'metricAttributeFilters': []
                            }
                        },
                        {
                            'measure': {
                                'type': 'metric',
                                'objectUri': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1556',
                                'title': 'Probability BOP',
                                'format': '#,##0.00',
                                'metricAttributeFilters': []
                            }
                        },
                        {
                            'measure': {
                                'type': 'metric',
                                'objectUri': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/2825',
                                'title': '# of Opportunities (Account: 1 Source Consulting, 1-800 Postcards, 1-800 We Answer, 1-888-OhioComp, 14 West)',
                                'format': '#,##0',
                                'metricAttributeFilters': [
                                    {
                                        'listAttributeFilter': {
                                            'attribute': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969',
                                            'displayForm': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/970',
                                            'default': {
                                                'negativeSelection': false,
                                                'attributeElements': [
                                                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=961042',
                                                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=961038',
                                                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=958079',
                                                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=961044',
                                                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=961046'
                                                ]
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    ],
                    'categories': [
                        {
                            'category': {
                                'type': 'attribute',
                                'collection': 'attribute',
                                'displayForm': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1028'
                            }
                        }
                    ],
                    'filters': [
                        {
                            'listAttributeFilter': {
                                'attribute': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1025',
                                'displayForm': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1028',
                                'default': {
                                    'negativeSelection': false,
                                    'attributeElements': [
                                        '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1025/elements?id=1243',
                                        '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1025/elements?id=1242',
                                        '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1025/elements?id=1241',
                                        '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1025/elements?id=1240',
                                        '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1025/elements?id=1239',
                                        '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1025/elements?id=1238',
                                        '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1025/elements?id=1236'
                                    ]
                                }
                            }
                        }, {
                            'dateFilterSettings': {
                                'dimension': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/16561',
                                'granularity': 'GDC.time.week',
                                'from': -3,
                                'to': 0
                            }
                        }
                    ],
                    'stacks': []
                };
            });

            it('creates proper configuration for execution', () => {
                const execConfig = ex.mdToExecutionConfiguration(mdObj);

                expectColumns([
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1028',
                    'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.filtered_sum.b9f95d95adbeac03870b764f8b2c3402',
                    'attribute_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1244.generated.count.a865b88e507b9390e2175b79e1d6252f',
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1556',
                    'metric_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_2825.generated.filtered_base.3812d81c1c1609700e47fc800e85bfac'
                ], execConfig);

                expectMetricDefinition({
                    identifier: 'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.filtered_sum.b9f95d95adbeac03870b764f8b2c3402',
                    expression: 'SELECT SUM([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1144]) WHERE [/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/949] IN ([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/949/elements?id=168284],[/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/949/elements?id=168282])',
                    title: 'Sum of Amount',
                    format: '#,##0.00'
                }, execConfig);

                expectMetricDefinition({
                    'identifier': 'attribute_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1244.generated.count.a865b88e507b9390e2175b79e1d6252f',
                    'expression': 'SELECT COUNT([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1244])',
                    'title': 'Count of Activity',
                    'format': '#,##0.00'
                }, execConfig);

                expectMetricDefinition({
                    identifier: 'metric_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_2825.generated.filtered_base.3812d81c1c1609700e47fc800e85bfac',
                    expression: 'SELECT [/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/2825] WHERE [/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969] IN ([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=961042],[/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=961038],[/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=958079],[/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=961044],[/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=961046])',
                    title: '# of Opportunities (Account: 1 Source Consulting, 1-800 Postcards, 1-800 We Answer, 1-888-OhioComp, 14 West)',
                    format: '#,##0'
                }, execConfig);

                expectWhereCondition({
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1028': {
                        '$in': [
                            { 'id': 1243 },
                            { 'id': 1242 },
                            { 'id': 1241 },
                            { 'id': 1240 },
                            { 'id': 1239 },
                            { 'id': 1238 },
                            { 'id': 1236 }
                        ]
                    },
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/16561': {
                        '$between': [-3, 0],
                            '$granularity': 'GDC.time.week'
                    }
                }, execConfig);
            });

            it('handles empty filters', () => {
                const mdObjWithoutFilters = cloneDeep(mdObj);
                mdObjWithoutFilters.measures[0].measure.metricAttributeFilters[0].listAttributeFilter.default.attributeElements = [];
                const execConfig = ex.mdToExecutionConfiguration(mdObjWithoutFilters);

                expectColumns([
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1028',
                    'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.sum.7537800b1daf7582198e84ca6205d600',
                    'attribute_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1244.generated.count.a865b88e507b9390e2175b79e1d6252f',
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1556',
                    'metric_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_2825.generated.filtered_base.3812d81c1c1609700e47fc800e85bfac'
                ], execConfig);

                expectMetricDefinition({
                    identifier: 'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.sum.7537800b1daf7582198e84ca6205d600',
                    expression: 'SELECT SUM([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1144])',
                    title: 'Sum of Amount',
                    format: '#,##0.00'
                }, execConfig);

                expectMetricDefinition({
                    identifier: 'attribute_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1244.generated.count.a865b88e507b9390e2175b79e1d6252f',
                    expression: 'SELECT COUNT([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1244])',
                    title: 'Count of Activity',
                    format: '#,##0.00'
                }, execConfig);

                expectMetricDefinition({
                    'identifier': 'metric_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_2825.generated.filtered_base.3812d81c1c1609700e47fc800e85bfac',
                    'expression': 'SELECT [/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/2825] WHERE [/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969] IN ([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=961042],[/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=961038],[/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=958079],[/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=961044],[/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/969/elements?id=961046])',
                    'title': '# of Opportunities (Account: 1 Source Consulting, 1-800 Postcards, 1-800 We Answer, 1-888-OhioComp, 14 West)',
                    'format': '#,##0'
                }, execConfig);

                expectWhereCondition({
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1028': {
                        '$in': [
                            { 'id': 1243 },
                            { 'id': 1242 },
                            { 'id': 1241 },
                            { 'id': 1240 },
                            { 'id': 1239 },
                            { 'id': 1238 },
                            { 'id': 1236 }
                        ]
                    },
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/16561': {
                        '$between': [-3, 0],
                        '$granularity': 'GDC.time.week'
                    }
                }, execConfig);
            });
        });

        describe('generating contribution metric', () => {
            let mdObjContribution;
            beforeEach(() => {
                mdObjContribution = {
                    'measures': [
                        {
                            'measure': {
                                'type': 'metric',
                                'objectUri': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/2825',
                                'title': '% # of Opportunities',
                                'format': '#,##0',
                                'metricAttributeFilters': [],
                                'showInPercent': true,
                                'showPoP': false
                            }
                        }
                    ],
                    'categories': [
                        {
                            'category': {
                                'type': 'attribute',
                                'collection': 'attribute',
                                'attribute': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1027',
                                'displayForm': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1028'
                            }
                        }
                    ],
                    'filters': [],
                    'stacks': []
                };
            });

            it('for calculated measure', () => {
                const execConfig = ex.mdToExecutionConfiguration(mdObjContribution);

                expectColumns([
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1028',
                    'metric_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_2825.generated.percent.0eb685df0742b4e27091746615e06193'
                ], execConfig);

                expectMetricDefinition({
                    title: '% # of Opportunities',
                    identifier: 'metric_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_2825.generated.percent.0eb685df0742b4e27091746615e06193',
                    expression: 'SELECT (SELECT [/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/2825]) / (SELECT [/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/2825] BY ALL [/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1027])',
                    format: '#,##0.00%'
                }, execConfig);
            });

            it('for generated measure', () => {
                mdObjContribution.measures = [
                    {
                        'measure': {
                            'type': 'fact',
                            'aggregation': 'sum',
                            'objectUri': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1144',
                            'title': 'Sum of Amount',
                            'format': '#,##0.00',
                            'showInPercent': true
                        }
                    }
                ];

                const execConfig = ex.mdToExecutionConfiguration(mdObjContribution);

                expectColumns([
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1028',
                    'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.percent.7abc1f3bf5c8130d11493f0cc5780ae2'
                ], execConfig);

                expectMetricDefinition({
                    identifier: 'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.sum.7537800b1daf7582198e84ca6205d600',
                    expression: 'SELECT SUM([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1144])',
                    title: 'Sum of Amount',
                    format: '#,##0.00'
                }, execConfig);

                expectMetricDefinition({
                    title: '% Sum of Amount',
                    identifier: 'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.percent.7abc1f3bf5c8130d11493f0cc5780ae2',
                    expression: 'SELECT (SELECT {fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.sum.7537800b1daf7582198e84ca6205d600}) / (SELECT {fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.sum.7537800b1daf7582198e84ca6205d600} BY ALL [/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1027])',
                    format: '#,##0.00%'
                }, execConfig);
            });
        });

        describe('generating pop metric', () => {
            let mdObj;
            beforeEach(() => {
                mdObj = {
                    'measures': [
                        {
                            'measure': {
                                'type': 'metric',
                                'objectUri': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/2825',
                                'title': '# of Opportunities',
                                'format': '#,##0',
                                'metricAttributeFilters': [],
                                'showInPercent': false,
                                'showPoP': true
                            }
                        }
                    ],
                    'categories': [
                        {
                            'category': {
                                'type': 'date',
                                'collection': 'attribute',
                                'displayForm': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1234',
                                'attribute': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1233'
                            }
                        }
                    ],
                    'filters': [],
                    'stacks': []
                };
            });

            it('for calculated metric', () => {
                const execConfig = ex.mdToExecutionConfiguration(mdObj);

                expectColumns([
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1234',
                    'metric_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_2825.generated.pop.c6186e1467d5ffd0785b021fa9ff6490',
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/2825'
                ], execConfig);

                expectMetricDefinition({
                    title: '# of Opportunities - previous year',
                    identifier: 'metric_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_2825.generated.pop.c6186e1467d5ffd0785b021fa9ff6490',
                    expression: 'SELECT (SELECT [/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/2825]) FOR PREVIOUS ([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1233])',
                    format: '#,##0'
                }, execConfig);
            });

            it('for generated measure', () => {
                mdObj.measures = [
                    {
                        'measure': {
                            'type': 'fact',
                            'aggregation': 'sum',
                            'objectUri': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1144',
                            'title': 'Sum of Amount',
                            'format': '#,##0.00',
                            'showPoP': true
                        }
                    }
                ];

                const execConfig = ex.mdToExecutionConfiguration(mdObj);

                expectColumns([
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1234',
                    'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.pop.cecff15ef30ca1306bfe1bdee0534bf2',
                    'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.sum.7537800b1daf7582198e84ca6205d600'
                ], execConfig);

                expectMetricDefinition({
                    identifier: 'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.pop.cecff15ef30ca1306bfe1bdee0534bf2',
                    expression: 'SELECT (SELECT {fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.sum.7537800b1daf7582198e84ca6205d600}) FOR PREVIOUS ([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1233])',
                    title: 'Sum of Amount - previous year',
                    format: '#,##0.00'
                }, execConfig);

                expectMetricDefinition({
                    identifier: 'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.sum.7537800b1daf7582198e84ca6205d600',
                    expression: 'SELECT SUM([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1144])',
                    title: 'Sum of Amount',
                    format: '#,##0.00'
                }, execConfig);
            });

            it('for generated measure with contribution', () => {
                mdObj.measures = [
                    {
                        'measure': {
                            'type': 'fact',
                            'aggregation': 'sum',
                            'objectUri': '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1144',
                            'title': 'Sum of Amount',
                            'format': '#,##0.00',
                            'showPoP': true,
                            'showInPercent': true
                        }
                    }
                ];

                const execConfig = ex.mdToExecutionConfiguration(mdObj);

                expectColumns([
                    '/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1234',
                    'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.pop.8802950f69a83c21a5ae38f306148a02',
                    'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.percent.49a4394f29b465c3d494ead9ef09732d'
                ], execConfig);

                expectMetricDefinition({
                    title: '% Sum of Amount - previous year',
                    identifier: 'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.pop.8802950f69a83c21a5ae38f306148a02',
                    expression: 'SELECT (SELECT {fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.percent.49a4394f29b465c3d494ead9ef09732d}) FOR PREVIOUS ([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1233])',
                    format: '#,##0.00%'
                }, execConfig);

                expectMetricDefinition({
                    title: 'Sum of Amount',
                    identifier: 'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.sum.7537800b1daf7582198e84ca6205d600',
                    expression: 'SELECT SUM([/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1144])',
                    format: '#,##0.00'
                }, execConfig);

                expectMetricDefinition({
                    title: '% Sum of Amount',
                    identifier: 'fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.percent.49a4394f29b465c3d494ead9ef09732d',
                    expression: 'SELECT (SELECT {fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.sum.7537800b1daf7582198e84ca6205d600}) / (SELECT {fact_qamfsd9cw85e53mcqs74k8a0mwbf5gc2_1144.generated.sum.7537800b1daf7582198e84ca6205d600} BY ALL [/gdc/md/qamfsd9cw85e53mcqs74k8a0mwbf5gc2/obj/1233])',
                    format: '#,##0.00%'
                }, execConfig);
            });
        });
    });
});
