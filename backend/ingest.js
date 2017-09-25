'use strict';
var AWS = require("aws-sdk");
//var jsonpath = require('jsonpath-plus');
var jsonpath = require('jsonpath');
var sensorthing = require('sensorthing');

var Sensor = require('model/Sensor');
var ObservedProperty = require('model/ObservedProperty');
var Datastream = require('model/Datastream');
var Thing = require('model/Thing');
var Location = require('model/Location');
var Sensor = require('model/Sensor');

module.exports.iot = (event, context, callback) => {
        var kinesis = new AWS.Kinesis({
            apiVersion: '2013-12-02'
        });

        var eventText = JSON.stringify(event, null, 2);
        console.log("Received event:", eventText);

        var records = [];
        records.push({"Data":eventText, "PartitionKey":"fix"});

        kinesis.putRecords({
                  Records: records,
                  StreamName: 'measures'
              }, function(err, data) {
                  if (err) {
                      console.error(err);
                  }
              });

  callback(null, { message: 'Transformation function executed successfully!', event });
  };


module.exports.http = (event, context, callback) => {

  var kinesis = new AWS.Kinesis({
      apiVersion: '2013-12-02'
  });

  var eventText = JSON.stringify(event.queryStringParameters, null, 2);
  console.log("Received event:", eventText);

  var records = [];
  records.push({"Data":eventText, "PartitionKey":"fix"});

  kinesis.putRecords({
            Records: records,
            StreamName: 'measures'
        }, function(err, data) {
            if (err) {
                console.error(err);
            } 

            else {

              const response = {
                statusCode: 200,
                body: JSON.stringify({
                  message: 'Go Serverless v1.0! Your function executed successfully!',
                  value: eventText,
                  return: data
                }),
              };
              callback(null, response);
            }
        });

}

module.exports.post_thingdatastreamobservations = (event, context, callback) => {

  var kinesis = new AWS.Kinesis({
      apiVersion: '2013-12-02'
  });
  
  var datastreamid;
  if (event.path!=null) {
    datastreamid = event.path.id;
    console.log("Found id: ", datastreamid);
  }

  var observationid = guid();
  var now = new Date();

  var eventText = event.body;
  eventText.datastream_id = datastreamid;
  eventText.id = observationid;
  eventText.phenomenonTime = now.toISOString();
  eventText.resultTime = now.toISOString();

  console.log("Received event:", eventText);

  var records = [];
  records.push({"Data":JSON.stringify(eventText, null, 2), "PartitionKey":"fix"});

  kinesis.putRecords({
            Records: records,
            StreamName: 'observations'
        }, function(err, data) {
            if (err) {
                console.error(err);
            } 

            else {

              const response = {
                statusCode: 200,
                body: JSON.stringify({
                  "@iot.id": observationid,
                  "@iot.selfLink": getBaseUrl(event)+"/Observations/"+observationid,
                  "phenomenonTime": now.toUTCString(),
                  "result": event.body.result,
                  "resultTime": now.toUTCString(),
                  "Datastream@iot.navigationLink": getBaseUrl(event)+"/Observations/"+observationid+"/Datastream",
                  "FeatureOfInterest@iot.navigationLink": getBaseUrl(event)+"/Observations/"+observationid+"/FeatureOfInterest"
                  })
              };
              callback(null, response);
            }
        });

};

module.exports.post_thing = (event, context, callback) => {
  
  var thing_id;
  if (event.path!=null) {
    thing_id = event.path.id;
    console.log("Found id: ", thing_id);
  }

  var now = new Date();

  var eventText = event.body;
  eventText.datastream_id = datastreamid;
  eventText.id = observationid;
  eventText.phenomenonTime = now.toISOString();
  eventText.resultTime = now.toISOString();

  console.log("Received event:", eventText);


};


module.exports.post_location = (event, context, callback) => {

  console.log("Received event:", event);

/**
{
  "name": "UofC CCIT",
  "description": "University of Calgary, CCIT building",
  "encodingType": "application/vnd.geo+json",
  "location": {
    "type": "Point",
    "coordinates": [-114.133, 51.08]
  }
}
**/

/**
event.cognitoPoolClaims: 
{ email: 'nikolaus.pohle@gmail.com',
sub: '90a5dd13-dc1c-4190-b7e5-293cbe9335ce' }
**/

  var location = new Location(event.body);
  var datapromise = location.save(event.cognitoPoolClaims.sub);

  datapromise
    .then(function(location) {
      callback(null, location.renderAPIOutput(getBaseUrl(event)));
    })
    .catch(function(error) {
      console.log(error);
    });

};

module.exports.post_datastream = (event, context, callback) => {

  console.log("Received event:", event);

/**
**/

  var eventBody = event.body;

  var datastream = new Datastream(event.body);
  var datapromise = datastream.save(event.cognitoPoolClaims.sub);

  datapromise
    .then(function(datastream) {
      callback(null, datastream.renderAPIOutput(getBaseUrl(event)));      
    })
    .catch(function(error) {
      console.log(error);
    });

};


module.exports.post_thing = (event, context, callback) => {

  console.log("Received event:", event);

/**
**/

  var eventBody = event.body;

  var thing = new Thing(event.body);
  var datapromise = thing.save(event.cognitoPoolClaims.sub);

  datapromise
    .then(function(thing) {
      callback(null, thing.renderAPIOutput(getBaseUrl(event)));
    })
        .catch(function(error) {
      console.log(error);
    });

};

module.exports.post_thingobservations = (event, context, callback) => {

  /** 
  {
  "esp8266id": "1497010", 
  "software_version": "NRZ-2017-086", 
  "sensordatavalues":[
    {"value_type":"SDS_P1","value":"8.07"},
    {"value_type":"SDS_P2","value":"7.37"},
    {"value_type":"temperature","value":"22.00"},
    {"value_type":"humidity","value":"57.70"},
    {"value_type":"samples","value":"715832"},
    {"value_type":"min_micro","value":"199"},
    {"value_type":"max_micro","value":"25504"},
    {"value_type":"signal","value":"-89"}
    ]
  }
  **/ 

  var now = new Date();

  var kinesis = new AWS.Kinesis({
      apiVersion: '2013-12-02'
  });
  
  var thingid;
  if (event.path!=null) {
    thingid = event.path.id;
    console.log("Found thing id: ", thingid);
  }

  var datapromise = Thing.findById(thingid);
  datapromise
    .then(function(thing) {

      console.log("thing", thing);

      var records = [];
      
      var pm10value = jsonpath.query(event.body, 'sensordatavalues[?(@.value_type=="SDS_P1")].value');
      var pm10datastream = jsonpath.query(thing.data, 'Datastreams[?(@.data.ObservedProperty.data.definition=="http://purl.obolibrary.org/obo/ENVO_01000405")].data.id');

      var pm10record = {};
      pm10record.datastream_id = pm10datastream[0];
      pm10record.id = guid();
      pm10record.phenomenonTime = now.toISOString();
      pm10record.resultTime = now.toISOString();
      pm10record.result = pm10value[0];
      console.log('pm10record', pm10record);
      records.push({"Data":JSON.stringify(pm10record, null, 2), "PartitionKey":"fix"});

      var pm25value = jsonpath.query(event.body, 'sensordatavalues[?(@.value_type=="SDS_P2")].value');
      var pm25datastream = jsonpath.query(thing.data, 'Datastreams[?(@.data.ObservedProperty.data.definition=="http://purl.obolibrary.org/obo/ENVO_01000415")].data.id');

      var pm25record = {};
      pm25record.datastream_id = pm25datastream[0];
      pm25record.id = guid();
      pm25record.phenomenonTime = now.toISOString();
      pm25record.resultTime = now.toISOString();
      pm25record.result = pm25value[0];
      records.push({"Data":JSON.stringify(pm25record, null, 2), "PartitionKey":"fix"});
      
      var temperaturevalue = jsonpath.query(event.body, 'sensordatavalues[?(@.value_type=="temperature")].value');
      var temperaturedatastream = jsonpath.query(thing.data, 'Datastreams[?(@.data.ObservedProperty.data.definition=="http://purl.obolibrary.org/obo/ENVO_09200001")].data.id');

      var temperaturerecord = {};
      temperaturerecord.datastream_id = temperaturedatastream[0];
      temperaturerecord.id = guid();
      temperaturerecord.phenomenonTime = now.toISOString();
      temperaturerecord.resultTime = now.toISOString();
      temperaturerecord.result = temperaturevalue[0];
      records.push({"Data":JSON.stringify(temperaturerecord, null, 2), "PartitionKey":"fix"});

      var humidityvalue = jsonpath.query(event.body, 'sensordatavalues[?(@.value_type=="humidity")].value');
      var humiditydatastream = jsonpath.query(thing.data, 'Datastreams[?(@.data.ObservedProperty.data.definition=="http://purl.obolibrary.org/obo/ENVO_01000268")].data.id');

      var humidityrecord = {};
      humidityrecord.datastream_id = humiditydatastream[0];
      humidityrecord.id = guid();
      humidityrecord.phenomenonTime = now.toISOString();
      humidityrecord.resultTime = now.toISOString();
      humidityrecord.result = humidityvalue[0];
      records.push({"Data":JSON.stringify(humidityrecord, null, 2), "PartitionKey":"fix"});

      kinesis.putRecords({
                Records: records,
                StreamName: 'observations'
            }, function(err, data) {
                if (err) {
                    console.error(err);
                } 

                else {

                  const response = {
                    statusCode: 200,
                    body: JSON.stringify({
                      "@iot.count": 4,
                      "value": [
                        {
                        "@iot.id": pm10record.id,
                        "@iot.selfLink": getBaseUrl(event)+"/Observations/"+pm10record.id,
                        "phenomenonTime": now.toUTCString(),
                        "result": pm10record.result,
                        "resultTime": now.toUTCString(),
                        "Datastream@iot.navigationLink": getBaseUrl(event)+"/Datastreams/"+pm10record.datastream_id
                        },
                        {
                        "@iot.id": pm25record.id,
                        "@iot.selfLink": getBaseUrl(event)+"/Observations/"+pm25record.id,
                        "phenomenonTime": now.toUTCString(),
                        "result": pm25record.result,
                        "resultTime": now.toUTCString(),
                        "Datastream@iot.navigationLink": getBaseUrl(event)+"/Datastreams/"+pm25record.datastream_id
                        },
                        {
                        "@iot.id": temperaturerecord.id,
                        "@iot.selfLink": getBaseUrl(event)+"/Observations/"+temperaturerecord.id,
                        "phenomenonTime": now.toUTCString(),
                        "result": temperaturerecord.result,
                        "resultTime": now.toUTCString(),
                        "Datastream@iot.navigationLink": getBaseUrl(event)+"/Datastreams/"+temperaturerecord.datastream_id
                        },
                        {
                        "@iot.id": humidityrecord.id,
                        "@iot.selfLink": getBaseUrl(event)+"/Observations/"+humidityrecord.id,
                        "phenomenonTime": now.toUTCString(),
                        "result": humidityrecord.result,
                        "resultTime": now.toUTCString(),
                        "Datastream@iot.navigationLink": getBaseUrl(event)+"/Datastreams/"+humidityrecord.datastream_id
                        }
                      ]
                      })
                  };
                  callback(null, response);
                }
            });

      
    });

};

module.exports.writeluftdateninfo = (event, context, callback) => {

  var eventText = JSON.stringify(event, null, 2);
  console.log("Received event:", eventText);
  const response = {
    statusCode: 200,
    body: event
  };
  callback(null, response);
};

function getBaseUrl(event) {

  if (event.stage == "dev") {return "https://"+event.headers.Host+"/v1-"+event.stage;}
  if (event.stage == "prod") {return "https://"+event.headers.Host+"/v1";}

};

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}