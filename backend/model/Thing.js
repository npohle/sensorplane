'use strict';
var AWS = require("aws-sdk");

var Thing = function (data) {
  this.data = data;
  this.data.Datastreams = [];
  this.data.Location = null;
  if (this.data.id == null) {this.data.id = Thing.guid();}
  if (this.data.datastream_ids == undefined) {this.data.datastream_ids = [];}
}

Thing.prototype.data = {}

Thing.prototype.renderAPIOutput = function(baseurl) {

  var record = {};
  record["@iot.id"] = this.data.id;
  record["@iot.selfLink"] = baseurl+"/Things/"+this.data.id;
  record["description"] = this.data.description;
  record["name"] = this.data.name;
  record["properties"] = this.data.properties;

  console.log("found Datastreams ", this.data.Datastreams);
  if (this.data.Datastreams.length>0) {
    console.log("render datastreams")
    var datastreams = [];
    this.data.Datastreams.forEach(function(datastream) {
      datastreams.push(datastream.renderAPIOutput(baseurl));
    })
    record["Datastreams"] = datastreams;
  } else {
    record["Datastreams@iot.navigationLink"] = baseurl+"/Things/"+this.data.id+"/Datastreams";
  }

  if (this.data.Location!=null) {
    console.log("render Location", this.data.Location);
    record["Location"] = this.data.Location.renderAPIOutput(baseurl);
  } else {
    record["Location@iot.navigationLink"] = baseurl+"/Locations/"+this.data.location;
  }

  return record;

}

Thing.prototype.save = function(author) {

  console.log("save Thing ID", this.data.id);

  if (author!=null) {this.data.authors = [author];}

  delete this.data.Location;
  delete this.data.Datastreams;

  var docClient = new AWS.DynamoDB.DocumentClient();
  var dynamopromise = docClient.put(
        {
        "TableName": "sensorplane_things",
        "Item" : this.data
        })
      .promise()
      .then(function(data) {
        console.log("stored to Dynamo: ", data);
        return new Thing(data);
      });

  return dynamopromise;

};

Thing.findById = function (thing_id) {

  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: "sensorplane_things",
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames: {
      "#id": "id"
    },
    ExpressionAttributeValues: {
         ":id": thing_id
    }
  };

  var dynamopromise = docClient.query(params)
                                .promise()
                                .then(function(thingdata) {

                                  var locationpromise = Location.findById(thingdata.Items[0].location_id);
                                  return Promise.all([thingdata, locationpromise])

                                })
                                .then(function(data) {
                                  
                                  var datastreampromises = []
                                  if (data[0].Items[0].datastream_ids!=undefined) {
                                    data[0].Items[0].datastream_ids.forEach(
                                      function(datastream_id) {
                                        var datastreampromise = Datastream.findById(datastream_id);                                      
                                      datastreampromises.push(datastreampromise);
                                    });
                                  }
                                  return Promise.all([data[0], data[1], Promise.all(datastreampromises)])

                                })
                                .then(function(data) {
                                  
                                  var thing = null;
                                  if (data[0].Items[0] != undefined) {
                                    thing = new Thing(data[0].Items[0]);
                                    if (data[1]!=undefined) {thing.data.Location = data[1];}
                                    if (data[2]!=undefined) {
                                      thing.data.Datastreams = [];
                                      data[2].forEach(function(datastream) {
                                        if (datastream!=undefined) {thing.data.Datastreams.push(datastream);}
                                      });
                                    }                                    
                                  }
                                  return thing;

                                })
                                .catch(function(error) {console.log("Thing.findById error:", error)});
  return dynamopromise;

}

Thing.findAll = function (top, lastkey) {

  var docClient = new AWS.DynamoDB.DocumentClient();
  var tableName = "sensorplane_things";

  var params = {
    TableName: "sensorplane_things",
    Limit: top,
    Select: "ALL_ATTRIBUTES"
  };

  if (lastkey!=null) {
    params.ExclusiveStartKey = {"id": lastkey};
  }

  var dynamopromise = docClient.scan(params)
    .promise()
    .then(function(scanresult) {
      console.log("scanresult", scanresult);
      
      var records = [];
      scanresult.Items.forEach(function(data) {
        records.push(new Thing(data));
      })

      
      var response = {}
      if (scanresult.LastEvaluatedKey!=null) {response.LastEvaluatedKey = scanresult.LastEvaluatedKey.id;}
      response.Records = records;
      return response;

    });
  return dynamopromise;

}

Thing.guid = function () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

module.exports = Thing;

var Datastream = require('model/Datastream');
var Location = require('model/Location');
var ObservedProperty = require('model/ObservedProperty');
var Sensor = require('model/Sensor');