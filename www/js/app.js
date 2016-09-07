// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic', 'ngCordova'])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
  .state('map', {
    url: '/',
    templateUrl: 'templates/map.html',
    controller: 'MapCtrl'
  });

  $urlRouterProvider.otherwise("/");

})

.factory('ConnectivityMonitor', function($rootScope, $cordovaNetwork){

  return {
    isOnline: function(){

      if(ionic.Platform.isWebView()){
        return $cordovaNetwork.isOnline();
      } else {
        return navigator.onLine;
      }

    },
    ifOffline: function(){

      if(ionic.Platform.isWebView()){
        return !$cordovaNetwork.isOnline();
      } else {
        return !navigator.onLine;
      }

    }
  }
})

.factory('GoogleMaps', function($cordovaGeolocation, $ionicLoading,
$rootScope, $cordovaNetwork, $ionicModal, $filter, ConnectivityMonitor){
  // Google maps variables
  var apiKey = "AIzaSyAyj0f9OM6n7UTrnygjC0Woa_xAG-7YO3k";
  var map = null;

  // Modal suport variables and functions
  $ionicModal.fromTemplateUrl('templates/selectmodal.html', {
    scope:$rootScope,
    animation:'slide-in-right'
  }).then(function(modal) {
    $rootScope.modalSelect = modal;
  });

  $rootScope.openSelectModal = function() {
    $rootScope.modalSelect.show();
  };

  $ionicModal.fromTemplateUrl('templates/searchmodal.html', {
    scope:$rootScope,
    animation:'slide-in-right'
  }).then(function(modal) {
    $rootScope.modalSearch = modal;
  });

  $rootScope.openSearchModal = function() {
    $rootScope.modalSearch.show();
  };

  function send(){
    var options = {timeout: 10000, enableHighAccuracy: true};
    if(!$rootScope.bus) {
      $rootScope.openSelectModal();
    }
    else {
      console.log("Centering for sending");
      $cordovaGeolocation.getCurrentPosition(options).then(function(position){

        var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        var dateTime = new Date();

        // Create a client instance
        $rootScope.mqtt_client_send = new Paho.MQTT.Client("192.168.0.123", 9883, "myclientid_" + parseInt(Math.random() * 100, 10));

        // set callback handlers
        $rootScope.mqtt_client_send.onConnectionLost = onConnectionLost;
        $rootScope.mqtt_client_send.onMessageArrived = onMessageArrived;

        // connect the client
        $rootScope.mqtt_client_send.connect({onSuccess:onConnect, useSSL:true});


        // called when the client connects
        function onConnect() {
          // Once a connection has been made, make a subscription and send a message.
          console.log("send: onConnect");
          if(!$rootScope.bus) {
            $rootScope.openModal();
          }
          else {
            $rootScope.mqtt_client_send.subscribe($rootScope.bus.value);
            var data = {
                         lat:latLng.lat(),
                         lng:latLng.lng(),
                         time:dateTime.getTime()
                       }
            message = new Paho.MQTT.Message(JSON.stringify(data));
            message.destinationName = $rootScope.bus.value;
            message.qos = 0;
            message.retained = true;
            $rootScope.mqtt_client_send.send(message);
          }
        }

        // called when the client loses its connection
        function onConnectionLost(responseObject) {
          if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost:"+responseObject.errorMessage);
          }
        }

        // called when a message arrives
        function onMessageArrived(message) {
          console.log("onMessageArrived:"+message.payloadString);
          $rootScope.mqtt_client_send.disconnect();
        }

        map.panTo(latLng);

        var marker = new google.maps.Marker({
            map: map,
            animation: google.maps.Animation.DROP,
            position: latLng
        });

        var infoWindowContent ="<h4> Ônibus "+$rootScope.bus.text+"</h4>"+"<h4>"+$filter('date')(dateTime.getTime(),'HH:mm')+"</h4>";
        addInfoWindow(marker, infoWindowContent);
      }, function(error){
          console.log("Could not get location");
      });
    }
  }

  function center(){
    console.log("Centering");

    var options = {timeout: 10000, enableHighAccuracy: true};

    $cordovaGeolocation.getCurrentPosition(options).then(function(position){
      var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      map.panTo(latLng);
    }, function(error){
        console.log("Could not get location");
    });
  }

  function initMap(){
    var options = {timeout: 10000, enableHighAccuracy: true};

    $cordovaGeolocation.getCurrentPosition(options).then(function(position){

      var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

      var mapOptions = {
          center: latLng,
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.ROADMAP
      };

      map = new google.maps.Map(document.getElementById("map"), mapOptions);

      //Wait until the map is loaded
      google.maps.event.addListenerOnce(map, 'idle', function(){
          //loadMarkers();
          enableMap();
      });

      }, function(error){
        console.log("Could not get location");
      });

    }

    function enableMap(){
      $ionicLoading.hide();
    }

    function disableMap(){
      $ionicLoading.show({
        template: 'Você precisa estar conectado à internet para visualizar o mapa.'
      });
    }

    function loadGoogleMaps(){

      $ionicLoading.show({
        template: 'Carregando o Google Maps'
      });

      //This function will be called once the SDK has been loaded
      window.mapInit = function(){
        initMap();
      };

      //Create a script element to insert into the page
      var script = document.createElement("script");
      script.type = "text/javascript";
      script.id = "googleMaps";

      //Note the callback function in the URL is the one we created above
      if(apiKey){
        script.src = 'http://maps.google.com/maps/api/js?key=' + apiKey
  + '&callback=mapInit';
      }
      else {
  script.src = 'http://maps.google.com/maps/api/js?sensor=true&callback=mapInit';
      }

      document.body.appendChild(script);

    }

    function checkLoaded(){
      if(typeof google == "undefined" || typeof google.maps == "undefined"){
        loadGoogleMaps();
      } else {
        enableMap();
      }
    }
    /*
    function loadMarkers(){
      console.log("loadMarkers");
      var markers = [];

      // Create a client instance
      $rootScope.mqtt_client_load = new Paho.MQTT.Client("10.87.43.104", 9883, "myclientid_" + parseInt(Math.random() * 100, 10));

      // set callback handlers
      $rootScope.mqtt_client_load.onConnectionLost = onConnectionLost;
      $rootScope.mqtt_client_load.onMessageArrived = onMessageArrived;

      // connect the client
      $rootScope.mqtt_client_load.connect({onSuccess:onConnect, useSSL:true});


      // called when the client connects
      function onConnect() {
        // Once a connection has been made, make a subscription and send a message.
        console.log("markers: onConnect");
        $rootScope.mqtt_client_load.subscribe("Onibus/+");
      }

      // called when the client loses its connection
      function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
          console.log("onConnectionLost:"+responseObject.errorMessage);
        }
      }

      // called when a message arrives
      function onMessageArrived(message) {
        console.log("onMessageArrived:"+message.payloadString);
        var data = JSON.parse(message.payloadString)
        var latLng = new google.maps.LatLng(data.lat, data.lng);
        markers.push(data);
      }

      $rootScope.mqtt_client_load.unsubscribe("Onibus/+", {})
    }
    */
    function loadMarker(bus) {
      console.log("loadMarker");

      // Create a client instance
      $rootScope.mqtt_client_receive = new Paho.MQTT.Client("192.168.0.123", 9883, "myclientid_" + parseInt(Math.random() * 100, 10));

      // set callback handlers
      $rootScope.mqtt_client_receive.onConnectionLost = onConnectionLost;
      $rootScope.mqtt_client_receive.onMessageArrived = onMessageArrived;

      // connect the client
      $rootScope.mqtt_client_receive.connect({onSuccess:onConnect, useSSL:true});


      // called when the client connects
      function onConnect() {
        // Once a connection has been made, make a subscription and send a message.
        console.log("receive: onConnect");
        $rootScope.mqtt_client_receive.subscribe(bus.value);
      }

      // called when the client loses its connection
      function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
          console.log("onConnectionLost:"+responseObject.errorMessage);
        }
      }

      // called when a message arrives
      function onMessageArrived(message) {
        console.log("onMessageArrived:"+message.payloadString);
        var data = JSON.parse(message.payloadString)
        var latLng = new google.maps.LatLng(data.lat, data.lng);
        map.panTo(latLng);

        var marker = new google.maps.Marker({
            map: map,
            animation: google.maps.Animation.DROP,
            position: latLng
        });

        var infoWindowContent ="<h4> Ônibus "+bus.text+"</h4>"+"<h4>"+$filter('date')(data.time,'HH:mm')+"</h4>";
        addInfoWindow(marker, infoWindowContent);
        $rootScope.mqtt_client_receive.disconnect();
      }
    }

    function addInfoWindow(marker, message) {

        var infoWindow = new google.maps.InfoWindow({
            content: message
        });

        google.maps.event.addListener(marker, 'click', function () {
            infoWindow.open(map, marker);
        });

    }

    function addConnectivityListeners(){

      if(ionic.Platform.isWebView()){

        // Check if the map is already loaded when the user comes online,
  //if not, load it
        $rootScope.$on('$cordovaNetwork:online', function(event, networkState){
          checkLoaded();
        });

        // Disable the map when the user goes offline
        $rootScope.$on('$cordovaNetwork:offline', function(event, networkState){
          disableMap();
        });

      }
      else {

        //Same as above but for when we are not running on a device
        window.addEventListener("online", function(e) {
          checkLoaded();
        }, false);

        window.addEventListener("offline", function(e) {
          disableMap();
        }, false);
      }

    }

    return {
      init: function(key){

        if(typeof key != "undefined"){
          apiKey = key;
        }

        if(typeof google == "undefined" || typeof google.maps == "undefined"){

          console.warn("Google Maps SDK needs to be loaded");

          disableMap();

          if(ConnectivityMonitor.isOnline()){
            loadGoogleMaps();
          }
        }
        else {
          if(ConnectivityMonitor.isOnline()){
            initMap();
            enableMap();
          } else {
            disableMap();
          }
        }

        addConnectivityListeners();

      },
      centerOnMe: function(){
        center();
      },
      sendPosition: function(){
        send();
      },
      setBus: function(bus){
        $rootScope.bus = bus;
      },
      findBus: function(bus){
        loadMarker(bus)
      }
    }
})

.controller('SearchBusCtrl', function($scope, $rootScope, GoogleMaps) {
  $scope.searchItems = [{
    value:'Onibus/A',
    text:'A'
  }, {
    value:'Onibus/B',
    text:'B'
  }, {
    value:'Onibus/C',
    text:'C'
  }, {
    value:'Onibus/D',
    text:'D'
  }, {
    value:'Onibus/E',
    text:'E'
  }, {
    value:'Onibus/F',
    text:'F'
  }];

  $scope.searchBus = $scope.searchItems[0];

  $scope.onSearchChange = function() {
    console.log($scope.searchBus.value);
  };

  $scope.closeSearchModal = function() {
    GoogleMaps.findBus($scope.searchBus);
    $scope.modalSearch.hide();
  };
})

.controller('MapCtrl', function($scope, $state, $cordovaGeolocation, GoogleMaps) {
  $scope.centerOnMe = function(){
    GoogleMaps.centerOnMe();
  };

  $scope.sendPosition = function(){
    GoogleMaps.sendPosition();
  }
})

.controller('SelectBusCtrl', function($scope, $rootScope, GoogleMaps) {
  $scope.selecItems = [{
    value:'Onibus/A',
    text:'A'
  }, {
    value:'Onibus/B',
    text:'B'
  }, {
    value:'Onibus/C',
    text:'C'
  }, {
    value:'Onibus/D',
    text:'D'
  }, {
    value:'Onibus/E',
    text:'E'
  }, {
    value:'Onibus/F',
    text:'F'
  }];
  $scope.selectBus = $scope.selecItems[0];

  $scope.onChange = function() {
    console.log($scope.selectBus.value);
  }

  $scope.closeSelectModal = function() {
    GoogleMaps.setBus($scope.selectBus);
    GoogleMaps.sendPosition();
    $rootScope.modalSelect.hide();
  };
})

.run(function($ionicPlatform, GoogleMaps) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      // Don't remove this line unless you know what you are doing. It stops the viewport
      // from snapping when text inputs are focused. Ionic handles this internally for
      // a much nicer keyboard experience.
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }

    GoogleMaps.init("AIzaSyAyj0f9OM6n7UTrnygjC0Woa_xAG-7YO3k");
  });
})
