'use strict';
var AWS = require("aws-sdk");
var sensorthing = require('sensorthing');

var Sensor = require('model/Sensor');
var ObservedProperty = require('model/ObservedProperty');
var Datastream = require('model/Datastream');
var Thing = require('model/Thing');
var Location = require('model/Location');

//var jsonpath = require('jsonpath-plus');
var jsonpath = require('jsonpath');

module.exports.dynamodb = (event, context, callback) => {

  var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  var docClient = new AWS.DynamoDB.DocumentClient();
  var tableName = "measures";
  var datetime = new Date().getTime().toString();

  console.log("received from Kinesis: ", event);

  var decodedrecords = [];
  event.Records.forEach(
    function(element) {
      console.log("Encoded Object: ", element.kinesis.data);
      var decodedrecord = JSON.parse(new Buffer(element.kinesis.data, 'base64').toString('ascii'));
      decodedrecord.measureid = guid();
      decodedrecord.timestamp = datetime;
      decodedrecords.push(decodedrecord );
      console.log("Decoded Object: ", decodedrecord);

      docClient.put({
          "TableName": tableName,
          "Item" : decodedrecord
      }, function(err, data) {
          if (err) {
              console.log('error putting item into dynamodb failed: ', err);
          }
          else {
              console.log('great success: '+JSON.stringify(data, null, '  '));
          }
      });
    }
  );

};

module.exports.observations2dynamodb = (event, context, callback) => {

  var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  var docClient = new AWS.DynamoDB.DocumentClient();
  var tableName = "sensorplane_observations";

  console.log("received from Kinesis: ", event);

  var decodedrecords = [];
  event.Records.forEach(
    function(element) {
      console.log("Encoded Object: ", element.kinesis.data);
      var decodedrecord = JSON.parse(new Buffer(element.kinesis.data, 'base64').toString('ascii'));
      decodedrecords.push(decodedrecord );
      console.log("Decoded Object: ", decodedrecord);

      docClient.put({
          "TableName": tableName,
          "Item" : decodedrecord
      }, function(err, data) {
          if (err) {
              console.log('error putting item into dynamodb failed: ', err);
          }
          else {
              console.log('great success: '+JSON.stringify(data, null, '  '));
          }
      });
    }
  );

};

module.exports.get_thingsJSON = (event, context, callback) => {

  console.log("received from HTTP: ", event);
  
  var datapromise = sensorthing.thingsAll(100, 0);
  datapromise
    .then(function(thingslist) {
      console.log(JSON.stringify(thingslist)); // successful response
      callback(null, thingslist);
    })
    .catch(function(error) {
      console.log(error);
    });

};

module.exports.get_thingsAll = (event, context, callback) => {

  console.log("received from HTTP: ", event);
  
  var datapromise = sensorthing.thingsAll(100, 0);
  datapromise
    .then(function(thingslist) {

      console.log("thingslist", thingslist);

      var records = [];
      thingslist.Items.forEach(function(thing) {
        var record = {
          "@iot.id": thing.id,
          "@iot.selfLink": getBaseUrl(event)+"/Things/"+thing.id,
          "description": thing.description,
          "name": thing.name,
          "Datastreams@iot.navigationLink": getBaseUrl(event)+"/Things/"+thing.id+"/Datastreams",
          "HistoricalLocations@iot.navigationLink": getBaseUrl(event)+"/Things/"+thing.id+"/HistoricalLocations",
          "Locations@iot.navigationLink": getBaseUrl(event)+"/Things/"+thing.id+"/Locations"
          };
        records.push(record);
      });

      const response = {
          "@iot.count": thingslist.Count,
          "@iot.nextLink": getBaseUrl(event)+"/Things?$lastkey="+thingslist.LastEvaluatedKey,
          "value": records
      };

      callback(null, response);

    })
    .catch(function(error) {
      console.log(error);
    });

};

module.exports.get_thingsAll2 = (event, context, callback) => {
  
  var startkey;
  if (event.query!=null) {
    startkey = event.query.startkey;
  }

  var datapromise = Thing.findAll(10, startkey);
  datapromise
    .then(function(thingslist) {

      console.log("thingslist", thingslist);

      var records = [];
      thingslist.Records.forEach(function(thing) {
        var record = thing.renderAPIOutput(getBaseUrl(event));
        records.push(record);
      });

      var urlquery = "";
      if (thingslist.LastEvaluatedKey!=null) {urlquery = "?startkey="+thingslist.LastEvaluatedKey;}

      const response = {
          "@iot.count": thingslist.Records.length,
          "@iot.nextLink": getBaseUrl(event)+"/Things"+urlquery,
          "value": records
      };

      callback(null, response);

    })
    .catch(function(error) {
      console.log(error);
    });

};

module.exports.get_sensorlist = (event, context, callback) => {

  var startkey;
  if (event.query!=null) {
    startkey = event.query.startkey;
  }

  var datapromise = Sensor.list(10, startkey);
  datapromise
    .then(function(sensorlist) {

      console.log("sensorlist", sensorlist);

      var records = [];
      sensorlist.records.forEach(function(sensor) {
        var record = sensor.renderAPIOutput(getBaseUrl(event));
        records.push(record);
      });

      var urlquery = "";
      if (sensorlist.LastEvaluatedKey!=null) {urlquery = "?startkey="+sensorlist.LastEvaluatedKey.id;}

      const response = {
          "@iot.count": sensorlist.records.length,
          "@iot.nextLink": getBaseUrl(event)+"/Sensors"+urlquery,
          "value": records
      };

      callback(null, response);

    })
    .catch(function(error) {
      console.log(error);
    });

}

module.exports.get_sensor = (event, context, callback) => {

  var sensorid;
  if (event.path!=null) {
    sensorid = event.path.id;
  }

  var datapromise = Sensor.findById(sensorid);
  datapromise
    .then(function(sensor) {      
      callback(null, sensor.renderAPIOutput(getBaseUrl(event)));
    });
  }


module.exports.get_observedpropertylist = (event, context, callback) => {

  var startkey;
  if (event.query!=null) {
    startkey = event.query.startkey;
  }

  var datapromise = ObservedProperty.list(10, startkey);
  datapromise
    .then(function(propertylist) {

      console.log("propertylist", propertylist);

      var records = [];
      propertylist.records.forEach(function(property) {
        var record = property.renderAPIOutput(getBaseUrl(event));
        records.push(record);
      });

      var urlquery = "";
      if (propertylist.LastEvaluatedKey!=null) {urlquery = "?startkey="+propertylist.LastEvaluatedKey.id;}

      const response = {
          "@iot.count": propertylist.records.length,
          "@iot.nextLink": getBaseUrl(event)+"/ObservedProperties"+urlquery,
          "value": records
      };

      callback(null, response);

    })
    .catch(function(error) {
      console.log(error);
    });

}

module.exports.get_observedproperty = (event, context, callback) => {

  var propertyid;
  if (event.path!=null) {
    propertyid = event.path.id;
  }

  var datapromise = ObservedProperty.findById(propertyid);
  datapromise
    .then(function(observedproperty) {      
      callback(null, observedproperty.renderAPIOutput(getBaseUrl(event)));
    });
  }

module.exports.get_location = (event, context, callback) => {

  console.log("event", event);

  var locationid;
  if (event.path!=null) {
    locationid = event.path.id;
  }

  var datapromise = Location.findById(locationid);
  datapromise
    .then(function(location) {      
      callback(null, location.renderAPIOutput(getBaseUrl(event)));
    })
    .catch(function(error) {
        console.log(error);
    });
  }

module.exports.get_datastream = (event, context, callback) => {

  var datastreamid;
  if (event.path!=null) {
    datastreamid = event.path.id;
  }

  var datapromise = Datastream.findById(datastreamid);
  datapromise
    .then(function(datastream) {

      var propertypromise;
      var sensorpromise;

      if(event.query['$expand']!=null && event.query['$expand'].indexOf("ObservedProperty")>-1) {
        propertypromise = ObservedProperty.findById(datastream.data.observedproperty_id);
        propertypromise.then(function(property) {console.log("add property", property); datastream.data.ObservedProperty=property;})
      }

      if(event.query['$expand']!=null && event.query['$expand'].indexOf("Sensor")>-1) {
        sensorpromise = Sensor.findById(datastream.data.sensor_id);
        sensorpromise.then(function(sensor) {console.log("add sensor", sensor); datastream.data.Sensor = sensor;})
      }

      Promise.all([propertypromise, sensorpromise]).then(values => {
        callback(null, datastream.renderAPIOutput(getBaseUrl(event)));
      })
      .catch(function(error) {
        console.log(error);
      });
      
    });
  }

module.exports.get_thing2 = (event, context, callback) => {

  var thingid;
  if (event.path!=null) {
    thingid = event.path.id;
  }

  var datapromise = Thing.findById(thingid);
  datapromise
    .then(function(thing) {

      var promises = [];

      if(event.query['$expand']!=null && event.query['$expand'].indexOf("Datastreams")>-1) {
        console.log("expand Datastreams");
        //promises.push(thing.expandDatastreams());
      }

      if(event.query['$expand']!=null && event.query['$expand'].indexOf("Location")>-1) {
        console.log("expand Location ", thing.data.location_id);
        //promises.push(thing.expandLocation());
      }

      Promise.all(promises).then(values => {
        console.log("render thing ", thing);
        callback(null, thing.renderAPIOutput(getBaseUrl(event)));
      })
      .catch(function(error) {
        console.log(error);
      });
      
    });
  }

module.exports.get_datastreamlist = (event, context, callback) => {

  var startkey;
  if (event.query!=null) {
    startkey = event.query.startkey;
    console.log("startkey", startkey)
  }

  var datapromise = Datastream.list(10, startkey);
  datapromise
    .then(function(datastreamlist) {

      console.log("datastreamlist", datastreamlist);

      var records = [];
      datastreamlist.records.forEach(function(datastream) {
        var record = datastream.renderAPIOutput(getBaseUrl(event));
        records.push(record);
      });

      var urlquery = "";
      if (datastreamlist.LastEvaluatedKey!=null) {urlquery = "?startkey="+datastreamlist.LastEvaluatedKey.id;}

      const response = {
          "@iot.count": datastreamlist.records.length,
          "@iot.nextLink": getBaseUrl(event)+"/Datastreams"+urlquery,
          "value": records
      };

      callback(null, response);

    })
    .catch(function(error) {
      console.log(error);
    });

}


module.exports.get_thingdatastreams = (event, context, callback) => {

  var thing_id;
  if (event.path!=null) {
    thing_id = event.path.id;
  }
  console.log("thing id="+thing_id);

  var datapromise = sensorthing.thingsAll(10000, 0);
  datapromise
    .then(function(thingslist) {
      
      var datastreams = jsonpath.query(thingslist, '$..[?(@.id == "'+thing_id+'")].datastreams');
      console.log("datastreams = ", datastreams[0]);

      var records = [];
      
      datastreams[0].forEach( function(datastream) {
          var record = {};
          record["@iot.id"] = datastream.id;
          record["@iot.selfLink"] = getBaseUrl(event)+"/Datastreams/"+datastream.id;
          record["description"] = datastream.description;
          record["name"] = datastream.name;
          record["observationType"] = datastream.observationType;
          record["unitOfMeasurement"] = datastream.unitOfMeasurement;
          record["Observations@iot.navigationLink"] = getBaseUrl(event)+"/Datastreams/"+datastream.id+"/Observations";
          record["ObservedProperty@iot.navigationLink"] = getBaseUrl(event)+"/Datastreams/"+datastream.id+"/ObservedProperty";
          record["Sensor@iot.navigationLink"] = getBaseUrl(event)+"/Datastreams/"+datastream.id+"/Sensor";
          record["Thing@iot.navigationLink"] = getBaseUrl(event)+"/Things/"+thing_id;
          records.push(record);        
      });

      const response = {
          "@iot.count": records.length,
          "value" : records
      };

      callback(null, response);      

    })
    .catch(function(error) {
        console.log(error);
    });

};

module.exports.get_datastreams = (event, context, callback) => {

  var datastream_id;
  if (event.path!=null) {
    datastream_id = event.path.id;
  }

  var datapromise = sensorthing.thingsAll(10000, 0);
  datapromise
    .then(function(thingslist) {

      //var datastream = jsonpath({path: '$..datastreams[?(@.id == "'+datastream_id+'")].id', json: thingslist, resultType: "parent"});
      var datastream = jsonpath.parent(thingslist, '$..datastreams[?(@.id == "'+datastream_id+'")].id');
      var paths = jsonpath.paths(thingslist, '$..datastreams[?(@.id == "'+datastream_id+'")].id');
      var path = paths[0];
      var thing = thingslist[path[1]][path[2]];

      console.log("datastream path: ", path);
      console.log("thing: ", thing);

      var response = {};
      response["@iot.id"] = datastream_id;
      response["@iot.selfLink"] = getBaseUrl(event)+"/Datastreams/"+datastream_id;
      response["description"] = datastream.description;
      response["name"] = datastream.name;
      response["observationType"] = datastream.observationType;
      response["unitOfMeasurement"] = datastream.unitOfMeasurement;
      response["Observations@iot.navigationLink"] = getBaseUrl(event)+"/Datastreams/"+datastream_id+"/Observations";
      response["ObservedProperty@iot.navigationLink"] = getBaseUrl(event)+"/Datastreams/"+datastream_id+"/ObservedProperty";
      response["Sensor@iot.navigationLink"] = getBaseUrl(event)+"/Datastreams/"+datastream_id+"/Sensor";
      response["Thing@iot.navigationLink"] = getBaseUrl(event)+"/Things/"+thing.id;

      callback(null, response);
    })
    .catch(function(error) {
      console.log(error);
    });

};

module.exports.get_locationlist = (event, context, callback) => {

  var startkey;
  if (event.query!=null) {
    startkey = event.query.startkey;
  }

  var datapromise = Location.list(10, startkey);
  datapromise
    .then(function(locationlist) {

      console.log("locationlist", locationlist);

      var records = [];
      locationlist.records.forEach(function(location) {
        var record = location.renderAPIOutput(getBaseUrl(event));
        records.push(record);
      });

      var urlquery = "";
      if (locationlist.LastEvaluatedKey!=null) {urlquery = "?startkey="+locationlist.LastEvaluatedKey.id;}

      const response = {
          "@iot.count": locationlist.records.length,
          "@iot.nextLink": getBaseUrl(event)+"/Locations"+urlquery,
          "value": records
      };

      callback(null, response);

    })
    .catch(function(error) {
      console.log(error);
    });

}


module.exports.get_thinglocations = (event, context, callback) => {

  console.log("received from HTTP: ", event);

  var id;
  if (event.path!=null) {

    //var reID = /Things\/(.*?)\)/g;
    //var match = reID.exec(event.path);
    //id = match[1];

    id = event.path.id;
    console.log("Found id: ", id);
  }

  //var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  var docClient = new AWS.DynamoDB.DocumentClient();
  var tableName = "sensorplane_things";

  var params = {
    TableName: "sensorplane_things",
//    ProjectionExpression: "#id, #name",  //specifies the attributes you want in the scan result.
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames: {
      "#id": "id"
//      "#name": "name"
    },
    ExpressionAttributeValues: {
         ":id": id
    }
  };

  docClient.query(params, function(err, data) {
    if (err) {
      console.log(err); // an error occurred
      } 
    else {
      console.log(JSON.stringify(data)); // successful response

      var location = data.Items[0].locations[data.Items[0].location];
      location["@iot.id"]=data.Items[0].location;
      location["@iot.selfLink"] = getBaseUrl(event)+"/locations/"+data.Items[0].location;
      location["Things@iot.navigationLink"] = getBaseUrl(event)+"/locations/"+data.Items[0].location+"/Things",
      location["HistoricalLocations@iot.navigationLink"] = getBaseUrl(event)+"/locations/"+data.Items[0].location+"/HistoricalLocations"

      const response = {
          "@iot.count": 1,
          "value" : [location]
      };

      callback(null, response);

      }
  });

};


module.exports.get_thingdatastreamobservations2 = (event, context, callback) => {

  // https://api.sensorplane.io/v1-dev/Datastreams/b1619407-c202-44eb-a368-67cc78ccccd5/Observations?$filter=phenomenonTime%20lt%20%272016-11-24T14:37:01.000Z%27
  // ?$filter=phenomenonTime lt '2016-11-24T14:37:01.000Z'
  // ?$top=3&$orderby=phenomenonTime desc

  var datetime = (new Date(((new Date().getTime())-(1000*60*60*96)))).toISOString();
  var top = 99999;
  var asc = true;
  
  var filter;
  console.log("Event: ", event);
  if (event.query!=null) {
    
    if (event.query['$filter']!=undefined) {
      var regexresult = /phenomenonTime\slt\s\'(.*)\'/.exec(event.query['$filter']);
      console.log("Found regexresult: ", regexresult);
      if (regexresult!=null) {
        if (regexresult.length>1) {
          datetime = regexresult[1];
          console.log("Found datetime: ", datetime);
        }
      }
    }

    if (event.query['$top']!=undefined) {
      top = event.query['$top']
      console.log("Found top: ", datetime);      
    }

    if (event.query['$orderby']!=undefined) {
      var regexresult = /phenomenonTime\s(.*)/.exec(event.query['$orderby']);
      console.log("Found regexresult: ", regexresult);
      if (regexresult!=null) {
        if (regexresult.length>1) {
          if (regexresult[1] == 'desc') {asc = false;};
          console.log("Found order ascending: ", asc);
        } 
      }
    }

  }
  
  var datastream_id;
  if (event.path!=null) {
    datastream_id = event.path.id;
    console.log("Found id: ", datastream_id);
  }

  var docClient = new AWS.DynamoDB.DocumentClient();

  console.log("datetime: ", datetime);

  var params = {
    TableName: "sensorplane_observations",
    KeyConditionExpression: "#id = :id and #ts > :ts",
    Limit: top,
    ScanIndexForward: asc,
    ExpressionAttributeNames: {
      "#id": "datastream_id",
      "#ts": "phenomenonTime"
    },
    ExpressionAttributeValues: {
         ":id": datastream_id,
         ":ts": datetime
    }
  };

  var dynamopromise = docClient.query(params).promise().then(function(data) {return data});

  dynamopromise.then(function(data) {

      //console.log(JSON.stringify(data)); // successful response

      var records = [];
      data.Items.forEach(function(observation) {
          var record = {};
          record["@iot.id"] = observation.id;
          record["@iot.selfLink"] = getBaseUrl(event)+"/Observations/"+observation.id;
          record["phenomenonTime"] = observation.phenomenonTime;
          record["result"] = observation.result;
          record["resultTime"] = null;
          record["Datastream@iot.navigationLink"] = getBaseUrl(event)+"/Datastreams/"+datastream_id;
          records.push(record);
      });

      const response = {
          "@iot.count": records.length,
          "value" : records
      };

      callback(null, response);

      })
  .catch(function(err) {
    console.log("Error:", err);
  });

};

module.exports.get_thingdatastreamobservations = (event, context, callback) => {

  var ts;
  if (event.queryStringParameters!=null) {
    ts = event.queryStringParameters.ts;
    console.log("Found ts: ", ts);
  }
  
  var id;
  if (event.path!=null) {
    id = event.path.id;
    console.log("Found id: ", id);
  }

  //var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  var docClient = new AWS.DynamoDB.DocumentClient();
  var tableName = "measures";
  var datetime = ((new Date().getTime())-(1000*60*60*96)).toString();

  console.log("received from HTTP: ", event);

  var params = {
    TableName: "measures",
    ProjectionExpression: "#ts, measureid, pm10, pm25, #t",  //specifies the attributes you want in the scan result.
    FilterExpression: "#ts > :ts",
    ExpressionAttributeNames: {
      "#ts": "timestamp",
      "#t": "temp"
    },
    ExpressionAttributeValues: {
         ":ts": datetime
    }
  };

  docClient.scan(params, function(err, data) {
    if (err) {
      console.log(err); // an error occurred
      } 
    else {
      console.log(JSON.stringify(data)); // successful response

      data.Items.sort(function(a, b){
          var keyA = new Date(Number(a.timestamp)),
              keyB = new Date(Number(b.timestamp));
          // Compare the 2 dates
          if(keyA < keyB) return -1;
          if(keyA > keyB) return 1;
          return 0;
      });

      var obsrecords = [];

      data.Items.forEach(function(observation) {

          var obsrecord = {};
          obsrecord["@iot.id"]=observation.measureid;
          obsrecord["@iot.selfLink"] = getBaseUrl(event)+"/Observations/"+observation.measureid;
          obsrecord["phenomenonTime"] = new Date(Number(observation.timestamp)).toString();

          if (id=="d22c9652-596d-4265-a95d-4b0e9f19e65b") {
            obsrecord["result"] = observation.pm25;
            obsrecord["Datastream@iot.navigationLink"] = getBaseUrl(event)+"/Observations/"+observation.measureid+"/Datastream";
            obsrecord["FeatureOfInterest@iot.navigationLink"] =getBaseUrl(event)+"/Observations/"+observation.measureid+"/FeatureOfInterest";
          }

          if (id=="0b02694b-176c-4342-86ee-e4c272bfc20d") {
            obsrecord["result"] = observation.pm10;
            obsrecord["Datastream@iot.navigationLink"] = getBaseUrl(event)+"/Observations/"+observation.measureid+"/Datastream";
            obsrecord["FeatureOfInterest@iot.navigationLink"] =getBaseUrl(event)+"/Observations/"+observation.measureid+"/FeatureOfInterest";
          }

          if (id=="b1619407-c202-44eb-a368-67cc78ccccd5") {
            obsrecord["result"] = observation.temp;
            obsrecord["Datastream@iot.navigationLink"] = getBaseUrl(event)+"/Observations/"+observation.measureid+"/Datastream";
            obsrecord["FeatureOfInterest@iot.navigationLink"] = getBaseUrl(event)+"/Observations/"+observation.measureid+"/FeatureOfInterest";
          }

          obsrecords.push(obsrecord);
      });

      const response = {
          "@iot.count": obsrecords.length,
          "value" : obsrecords
      };

      callback(null, response);

      }
  });

};

module.exports.csvfromdynamodb = (event, context, callback) => {

  var ts;
  if (event.queryStringParameters!=null) {
    ts = event.queryStringParameters.ts;
    console.log("Found ts: ", ts);
  }

  //var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  var docClient = new AWS.DynamoDB.DocumentClient();
  var tableName = "measures";
  var datetime = ((new Date().getTime())-(1000*60*120)).toString();

  console.log("received from HTTP: ", event);

  var params = {
    TableName: "measures",
    ProjectionExpression: "#ts, pm10, pm25, #t",  //specifies the attributes you want in the scan result.
    FilterExpression: "#ts > :ts",
    ExpressionAttributeNames: {
      "#ts": "timestamp",
      "#t": "temp"
    },
    ExpressionAttributeValues: {
         ":ts": datetime
    }
  };

  docClient.scan(params, function(err, data) {
    if (err) {
      console.log(err); // an error occurred
      } 
    else {
      console.log(JSON.stringify(data)); // successful response

      data.Items.sort(function(a, b){
          var keyA = new Date(Number(a.timestamp)),
              keyB = new Date(Number(b.timestamp));
          // Compare the 2 dates
          if(keyA < keyB) return -1;
          if(keyA > keyB) return 1;
          return 0;
      });

      var records = [];
      data.Items.forEach(
        function(element) {
          //records.push([((new Date()).setTime(Number(element.timestamp)/1000)).toString(), element.pm10, element.pm25, element.temp].join(","));
          records.push([new Date(Number(element.timestamp)).toString(), element.pm10, element.pm25, element.temp].join(","));
        }
      );



      const response = {
        statusCode: 200,
        body: records.join("\n")
      };

      callback(null, response);

      }
  });



};

module.exports.dump = (event, context, callback) => {

  var kinesis = new AWS.Kinesis({
      apiVersion: '2013-12-02'
  });

  var eventText = JSON.stringify(event, null, 2);
  console.log("Received event:", eventText);

  var next;
  if (event.queryStringParameters!=null) {
    next = event.queryStringParameters.next;
    console.log("Found NextShardIterator: ", next);
  }

  var params = {
    StreamName: 'observations',
    Limit: 100
  };

  kinesis.describeStream(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else {

        var streamdesc = data.StreamDescription;
        
        var params = {
          ShardId: data.StreamDescription.Shards[0].ShardId,
          StreamName: 'observations',
          //ShardIteratorType: 'TRIM_HORIZON', 
          ShardIteratorType: 'AT_TIMESTAMP',
          Timestamp: (((new Date()).getTime() - (15*1000*60))/1000)
        };

        kinesis.getShardIterator(params, function(err, data) {
          if (err) console.log(err, err.stack); // an error occurred
          else {
            
            if (next==null) next = data.ShardIterator;

            var params = {
              ShardIterator: next, 
              Limit: 100
            };

            kinesis.getRecords(params, function(err, data) {
              if (err) console.log(err, err.stack); // an error occurred
              else {

                var decodedrecords = [];
                data.Records.forEach(
                  function(element) {
                    decodedrecords.push(
                      {"Data": new Buffer(element.Data, 'base64').toString('ascii'), "ApproximateArrivalTimestamp": element.ApproximateArrivalTimestamp}
                    )
                  }
                );

                const response = {
                  statusCode: 200,
                  body: {
                    next: getBaseUrl(event)+"/dump?next="+encodeURIComponent(data.NextShardIterator),
                    //StreamDescription: streamdesc,
                    decodedrecords: decodedrecords
                  }
                };

                callback(null, response);

              }
            });

          }
        });

    }
  });

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
