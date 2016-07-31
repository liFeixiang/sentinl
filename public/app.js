import _ from 'lodash';
import moment from 'moment';
import chrome from 'ui/chrome';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';
import $ from 'jquery';

/* Elasticsearch */

import elasticsearch from 'elasticsearch-browser';

/* Ace editor */
import 'ace';

/* Timepicker */
import 'ui/timepicker';
import 'ui/courier';
import 'ui/filter_bar';

// import TableVisTypeProvider from 'ui/template_vis_type/TemplateVisType';
// import VisSchemasProvider from 'ui/vis/schemas';
// import tableVisTemplate from 'plugins/table_vis/table_vis.html';
// require('ui/registry/vis_types').register(TableVisTypeProvider);

import AggResponseTabifyTabifyProvider from 'ui/agg_response/tabify/tabify';
// import tableSpyModeTemplate from 'plugins/spy_modes/table_spy_mode.html';

import Notifier from 'ui/notify/notifier';
// import 'ui/autoload/styles';

/* Custom Template + CSS */
import './less/main.less';
import template from './templates/index.html';
import about from './templates/about.html';
import alarms from './templates/alarms.html';
import jsonHtml from './templates/json.html';

var impactLogo = require('plugins/kaae/kaae.svg');

chrome
  .setBrand({
    'logo': 'url(' + impactLogo + ') left no-repeat',
    'smallLogo': 'url(' + impactLogo + ') left no-repeat',
    'title': 'Kaae'
  })
  .setNavBackground('#222222')
  .setTabs([]);

uiRoutes.enable();

uiRoutes
.when('/', {
  template,
  resolve: {
    currentTime($http) {
      return $http.get('../api/kaae/example').then(function (resp) {
        return resp.data.time;
      });
    },
    currentWatchers($http) {
      return $http.get('../api/kaae/list').then(function (resp) {
	// console.log('DEBUG LIST:',resp);
        return resp;
      });
    }
  }
});

uiRoutes
.when('/alarms', {
  template: alarms,
  resolve: {
    currentTime($http) {
      return $http.get('../api/kaae/example').then(function (resp) {
        return resp.data.time;
      });
    },
    currentWatchers($http) {
      return $http.get('../api/kaae/list').then(function (resp) {
	// console.log('DEBUG LIST:',resp);
        return resp;
      });
    },
    currentAlarms($http) {
      return $http.get('../api/kaae/alarms').then(function (resp) {
	// console.log('DEBUG ALARMS:',resp);
        return resp;
      });
    },
    elasticAlarms($http) {
      return $http.get('../api/kaae/list/alarms').then(function (resp) {
	// console.log('DEBUG ALARMS:',resp);
        return resp;
      });
    }
  }
});

uiRoutes
.when('/about', {
  template: about
});

uiModules
.get('api/kaae', [])
.controller('kaaeHelloWorld', function ($rootScope, $scope, $route, $interval, $timeout, timefilter, Private, Notifier, $window, kbnUrl, $http) {
  $scope.title = 'Kaae';
  $scope.description = 'Kibana Alert App for Elasticsearch';
  // $scope.store = window.sessionStorage;

  $scope.notify = new Notifier();
  
  $scope.topNavMenu = [
  {
    key: 'watchers',
    description: 'WATCH',
    run: function () { kbnUrl.change('/'); }
  },
  {
    key: 'about',
    description: 'ABOUT',
    run: function () { kbnUrl.change('/about'); }
  }
  ];

  timefilter.enabled = true;

  /* Alarm Functions */

  var checkAlarm = function() {
	  if ($route.current.locals.currentAlarms.data) {
		   $scope.currentAlarms = $route.current.locals.currentAlarms.data.data;
	  } else { $scope.currentAlarms = [] }
  }

  var getAlarmsFromEs = function() {
	  if ($route.current.locals.elasticAlarms.data.hits) {
		   $scope.elasticAlarms = $route.current.locals.elasticAlarms.data.hits.hits;
	  } else { $scope.elasticAlarms = [] }
  }

  $scope.timeInterval = timefilter.time;

  /* Update Time Filter */
  var updateFilter = function(){
	  return $http.get('../api/kaae/set/interval/'+JSON.stringify($scope.timeInterval)).then(function (resp) {
	        // console.log('NEW TIMEFILTER:',$scope.timeInterval);
          });	
  }

  // First Boot
  // checkAlarm();
  getAlarmsFromEs();
  updateFilter()

  /* Listen for refreshInterval changes */

    $rootScope.$watchCollection('timefilter', function () {
      let timeInterval = _.get($rootScope, 'timefilter.time');
      let refreshValue = _.get($rootScope, 'timefilter.refreshInterval.value');
      let refreshPause = _.get($rootScope, 'timefilter.refreshInterval.pause');

      if ($scope.refreshalarms) {
	  	$timeout.cancel($scope.refreshalarms);
		$scope.refreshalarms = undefined;
      }

      if (timeInterval) {
	 	$scope.timeInterval = timeInterval;
	  	updateFilter();
      }

      if (refreshPause) {
		console.log('REFRESH PAUSED');
		return;
      }

      if (refreshValue != $scope.currentRefresh && refreshValue != 0) {
	// new refresh value
      	      if (_.isNumber(refreshValue) && !refreshPause) {
		    console.log('TIMEFILTER REFRESH');
		    $scope.newRefresh = refreshValue;
			  // Reset Interval & Schedule Next
			  $scope.currentRefresh = refreshValue;
			  $scope.refreshalarms = $timeout(function () {
			     // console.log('Reloading data....');
			     $route.reload();
		          }, $scope.currentRefresh);
  			  $scope.$watch('$destroy', $scope.refreshalarms);
	      } else {
		  console.log('NO REFRESH');
	  	  $scope.currentRefresh = 0;
		  $timeout.cancel($scope.refreshalarms);
	      }

      } else { 
  	          $timeout.cancel($scope.refreshalarms);
		  $route.reload(); 
      }

    });

	/*
	    $rootScope.$watchCollection('timefilter.time', function () {
	      let timeInterval = _.get($rootScope, 'timefilter.time');
		  $scope.timeInterval = timeInterval;
		  updateFilter();
	    });
	*/

  $scope.deleteAlarm = function($index){
	 $scope.notify.warning('KAAE function not yet implemented!');
	 $scope.currentAlarms.splice($index,1);     
  }

  var currentTime = moment($route.current.locals.currentTime);
  $scope.currentTime = currentTime.format('HH:mm:ss');
  var unsubscribe = $interval(function () {
    $scope.currentTime = currentTime.add(1, 'second').format('HH:mm:ss');
  }, 1000);
  $scope.$watch('$destroy', unsubscribe);

});

// WATCHERS CONTROLLER
uiModules
.get('api/kaae', [])
.controller('kaaeWatchers', function ($rootScope, $scope, $route, $interval, $timeout, timefilter, Private, Notifier, $window, kbnUrl, $http) {
  $scope.title = 'Kaae';
  $scope.description = 'Kibana Alert App for Elasticsearch';
  // $scope.store = window.sessionStorage;

  $scope.notify = new Notifier();
  
  $scope.topNavMenu = [
  {
    key: 'watchers',
    description: 'WATCH',
    run: function () { kbnUrl.change('/'); }
  },
  {
    key: 'about',
    description: 'ABOUT',
    run: function () { kbnUrl.change('/about'); }
  }
  ];

  timefilter.enabled = true;
  /*
	time: {
	        gt: timefilter.getBounds().min.valueOf(),
	        lte: timefilter.getBounds().max.valueOf()
	      }
  */

  // kbnUrl.change('/', {});

  const tabifyAggResponse = Private(AggResponseTabifyTabifyProvider);
  if ($route.current.locals.currentWatchers.data.hits.hits) {
	   $scope.watchers = $route.current.locals.currentWatchers.data.hits.hits;

	/*
	   $scope.spy.params.spyPerPage = 10;
	   $scope.table = tabifyAggResponse($scope.vis, $route.current.locals.currentWatchers.data.hits.hits, {
             canSplit: false,
             asAggConfigResults: true,
             partialRows: true
           });
	*/

  } else { $scope.watchers = []; }
  
  /* ACE Editor */
  $scope.editor;
  $scope.editor_status = { readonly: false, undo: false, new: false }; 
  $scope.setAce = function($index,edit) {
	  // var content = $scope.currentAlarms[$index];
	  $scope.editor = ace.edit("editor-"+$index);
	  var _session = $scope.editor.getSession();
    	  // var _renderer = $scope.editor.renderer;
	  $scope.editor.setReadOnly(edit);
	  $scope.editor_status.readonly = edit;
    	  _session.setUndoManager(new ace.UndoManager());

	  $scope.editor_status.undo = $scope.editor.session.getUndoManager().isClean();

	  if (!edit) { $scope.editor.getSession().setMode("ace/mode/json"); }
	  else { $scope.editor.getSession().setMode("ace/mode/text"); }
  }

  $scope.watcherDelete = function($index){
	 $scope.notify.warning('KAAE function not yet implemented!');
	 $scope.watchers.splice($index,1);     
  }

  $scope.watcherSave = function($index){
	 $scope.notify.warning('KAAE function not yet implemented!');
	 console.log('saving watcher ', $scope.watchers[$index] );
	 return $http.get('../api/kaae/get/'+$scope.watchers[$index]._id).then(function (resp) {
        	console.log('API GET:',resp.data.time);
         });

  }

  $scope.getWatchers = function(){
	return $scope.watchers;
  }

  /* New Entry */
  $scope.watcherNew = function(newwatcher) {
	if (!newwatcher) {
	  var newwatcher = {
		  "_index": "watcher",
		  "_type": "watch",
		  "_id": "new",
		  "_score": 1,
		  "_source": {
		    "trigger": {
		      "schedule": {
		        "interval": "60"
		      }
		    },
	    "input": {
		      "search": {
		        "request": {
		          "indices": [],
		          "body": {},
		        }
		      }
		    },
		    "condition": {
		      "script": {
		        "script": "payload.hits.total > 100"
		      }
		    },
		    "transform": {},
		    "actions": {
		      "email_admin": {
		        "throttle_period": "15m",
		        "email": {
		          "to": "alarm@localhost",
		          "subject": "Kaae Alarm",
		          "priority": "high",
		          "body": "Found {{payload.hits.total}} Events"
		        }
		      }
		    }
		  }
		};
        }

	$scope.watchers.unshift(newwatcher);

	/*	
	 refreshalarms = $timeout(function () {
	      //console.log('set new watcher to edit mode...');
	      $scope.setAce(0,false);
 	 }, 200);
	*/
	
  }

  /* New Entry from Saved Kibana Query */
  if ($window.localStorage.getItem('kaae_saved_query')) {
	// $scope.watcherSaved = JSON.parse($window.localStorage.getItem('kaae_saved_query')); 
	$scope.watcherNew(JSON.parse($window.localStorage.getItem('kaae_saved_query')));
	$window.localStorage.removeItem('kaae_saved_query');
  }

  var currentTime = moment($route.current.locals.currentTime);
  $scope.currentTime = currentTime.format('HH:mm:ss');
  var unsubscribe = $interval(function () {
    $scope.currentTime = currentTime.add(1, 'second').format('HH:mm:ss');
  }, 1000);
  $scope.$watch('$destroy', unsubscribe);

});

// NEW END

uiModules
.get('api/kaae', [])
.controller('kaaeAbout', function ($scope, $route, $interval, timefilter, Notifier) {
  $scope.title = 'Kaae';
  $scope.description = 'Kibana Alert App for Elasticsearch';
  timefilter.enabled = false;
  $scope.notify = new Notifier();

  if (!$scope.notified) {
	  $scope.notify.warning('KAAE is a work in progress! Use at your own risk!');
	  $scope.notified = true;
  }

  var currentTime = moment($route.current.locals.currentTime);
  $scope.currentTime = currentTime.format('HH:mm:ss');
  var unsubscribe = $interval(function () {
    $scope.currentTime = currentTime.add(1, 'second').format('HH:mm:ss');
  }, 1000);
  $scope.$watch('$destroy', unsubscribe);

});


