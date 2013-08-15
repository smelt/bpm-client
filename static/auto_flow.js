var _fc_style = "<style>.stage {margin-bottom: 8px;}\
        	.task {padding-top: 8px;width: 128px;height: 64px;background: lightblue;\
            		margin-left: 8px;margin-top: 8px;margin-bottom: 8px;\
            		display: -moz-inline-stack;display: inline-block;*display: inline;\
            		zoom: 1;text-align: center;vertical-align: middle;}</style>"

var _fc_width = 320; //total width for flowchart

/* example data
 var _fc_data = [
 [
 {description:"ABC", name:1, predecessors:[]}
 ], //stage1
 [
 {description:"DEF", name:2, predecessors:[1]},
 {description:"GHI", name:3, predecessors:[1]}
 ], //stage2
 [
 {description:"JKL", name:4, predecessors:[2,3]}
 ], //stage3
 ]
 */

//generate a static flowchart, according to flowchart json
//	1) get data
//		data source: flowchart api
//  2) generate task box div
//  3) jsplumb connect boxes
function gen_static_flowchart(task_name, $chart_container, on_done) {
    var _fc_html = $('<div style="width: ' + _fc_width + 'px">')
    //ajax request
    $.ajax({
        url: '/v1/flowcharts/' + task_name + '/',
        type: 'GET',
        dataType: 'json',
        //data:
        success: function (_fc_data) {
            //draw stages
            $.each(_fc_data, function (_stage_idx, _stage) {
                var _stage_html = $('<div class="stage">')
                //draw steps
                $.each(_stage, function (_step_idx, _step) {
                    var _step_html = $('<div class="task">')
                        .attr('id', '_fc_step_' + _step.name)
                        .attr('style', 'width:' + _fc_width / _stage.length + 'px')
                        .html('<div>' + _step.type + ': ' + _step.description + '</div><div class="task-details"></div>')
                    _stage_html.append(_step_html)
                })

                _fc_html.append(_stage_html)
            })

            $chart_container.html(_fc_style + _fc_html.html());


            jsPlumb.ready(function () {
                jsPlumb.importDefaults({
                    //              // default to blue at one end and green at the other
                    //              EndpointStyles : [{ fillStyle:'#225588' }, { fillStyle:'#558822' }],
                    //              // blue endpoints 7 px; green endpoints 11.
                    //              Endpoints : [ [ "Dot", {radius:7} ], [ "Dot", { radius:11 } ]],
                    // the overlays to decorate each connection with.  note that the label overlay uses a function to generate the label text; in this
                    // case it returns the 'labelText' member that we set on each connection in the 'init' method below.
                    //              ConnectionOverlays : [
                    //                  [ "Arrow", { location: 0, width:12, height:8} ]
                    //              ]
                });

                var connectorPaintStyle = {
                    lineWidth: 2,
                    strokeStyle: "#c0c0c0",
                    joinstyle: "round"
                };
                // .. and this is the hover style.
                var connectorHoverStyle = {
                    lineWidth: 4,
                    strokeStyle: "#2e2aF8"
                };
                var endpointHoverStyle = {fillStyle: "#2e2aF8"};
                // the definition of source endpoints (the small blue ones)
                var sourceEndpoint = {
                    endpoint: "Blank",
                    isSource: true,
                    connector: [ "Flowchart", { stub: [0, 0], gap: 0, cornerRadius: 40, alwaysRespectStubs: true } ],
                    connectorStyle: connectorPaintStyle
                    //              hoverPaintStyle:endpointHoverStyle,
                    //              connectorHoverStyle:connectorHoverStyle,
                };
                var targetEndpoint = {
                    endpoint: ['Image', {src: '/static/down_arrow.png', hoverClass: 'hover-endpoint', width: 16, height: 16}],
                    paintStyle: {
                        fillStyle: "blue"
                    },
                    //              hoverPaintStyle:endpointHoverStyle,
                    dropOptions: { hoverClass: "hover", activeClass: "active" },
                    isTarget: true
                };
                jsPlumb.Defaults.Container = $('body');
                function connect(src, target) {
                    var src = jsPlumb.addEndpoint(src, sourceEndpoint, { anchor: 'BottomCenter' });
                    var target = jsPlumb.addEndpoint(target, targetEndpoint, { anchor: 'TopCenter' });
                    jsPlumb.connect({ source: src, target: target });
                }


                $.each(_fc_data, function (_stage_idx, _stage) {
                    $.each(_stage, function (_step_idx, _step) {
                        $.each(_step.predecessors, function (_pre_idx, _pre) {
                            connect($('#_fc_step_' + _pre), $('#_fc_step_' + _step.name))
                        })
                    })
                })

                if (on_done) {
                    on_done();
                }

            });


        }
    });
}


function get_task_trace(task_id, success) {
    $.ajax({
        url: '/v1/task/' + task_id + '/trace/',
        type: 'GET',
        dataType: 'json',
        success: success
    });
}

function render_state(task_id) {
    get_task_trace(task_id, function (task_trace) {
        $(task_trace.tasks).each(function (i, task) {
            var step_div = $('#_fc_step_' + task.step_name);
//            step_div.find('.task-details').html('<a href="/flowchart/task/' + task.id + '/">Details</a>');
            console.log(task.summary_state);
            if ('SUCCESS' == task.summary_state) {
                step_div.css('background-color', 'lightgreen');
            } else if ('FAILURE' == task.summary_state) {
                step_div.css('background-color', 'FireBrick');
            } else if ('RUNNING' == task.summary_state) {
                step_div.css('background-color', 'yellow');
            }
        });
        $(task_trace.free_steps).each(function (i, free_step) {
            var step_div = $('#_fc_step_' + free_step.step_name);
            if ('SUCCESS' == free_step.summary_state) {
                step_div.css('background-color', 'lightgreen');
            } else if ('FAILURE' == free_step.summary_state) {
                step_div.css('background-color', 'FireBrick');
            } else if ('RUNNING' == free_step.summary_state) {
                step_div.css('background-color', 'yellow');
            }
        });
    });
}

function gen_dynamic_flowchart(task_id, $chart_container) {
    get_task_trace(task_id, function (task_trace) {
        $chart_container.append(
            '<div>任务名: ' + task_trace.name + '</div>' +
            '<div>状态: ' + task_trace.state + '<button>暂停</button></div>' +
                '<div class="flowchart"></div>');
        gen_static_flowchart(task_trace.name, $chart_container.find('.flowchart'), function () {
            render_state(task_id);
            setInterval(function () {
                render_state(task_id);
            }, 1000);
        });
    });
}