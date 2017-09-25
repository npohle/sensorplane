'use strict';
var AWS = require("aws-sdk");

var Datastream = function (data) {
  this.data = data;
  if (this.data.id == null) {this.data.id = Datastream.guid();}
}

Datastream.prototype.data = {}

Datastream.prototype.renderAPIOutput = function(baseurl) {

  var record = {};

  record["@iot.id"] = this.data.id;
  record["@iot.selfLink"] = baseurl+"/Datastreams/"+this.data.id;
  record["description"] = this.data.description;
  record["name"] = this.data.name;
  record["observationType"] = this.data.observationType;
  record["unitOfMeasurement"] = this.data.unitOfMeasurement;
  record["Observations@iot.navigationLink"] = baseurl+"/Datastreams/"+this.data.id+"/Observations";

  if (this.data.ObservedProperty!=null) {
    record["ObservedProperty"] = this.data.ObservedProperty.renderAPIOutput(baseurl);
  } else {
    record["ObservedProperty@iot.navigationLink"] = baseurl+"/ObservedProperties/"+this.data.observedproperty_id;
  }

  if (this.data.Sensor!=null) {
    record["Sensor"] = this.data.Sensor.renderAPIOutput(baseurl);
  } else {
    record["Sensor@iot.navigationLink"] = baseurl+"/Sensors/"+this.data.sensor_id;
  }

  record["Thing@iot.navigationLink"] = baseurl+"/Things/"+this.data.thing_id;  
  return record;

}

Datastream.prototype.save = function(author) {

  var self = this;
  console.log("save Datastream ID", this.data.id);

  this.data.authors = [author];

  var docClient = new AWS.DynamoDB.DocumentClient();
  var dynamopromise = docClient.put(
        {
        "TableName": "sensorplane_datastreams",
        "Item" : this.data
        })
      .promise()
      .then(function() {
        console.log("put into DynamoDB: ", self.data);
        var sensor = Sensor.findById(self.data.sensor_id);
        var property = ObservedProperty.findById(self.data.observedproperty_id);
        var thing = Thing.findById(self.data.thing_id);
        return Promise.all([sensor, property, thing]);
      })
      .then(function(data) {
        console.log("found dependent entries: ", data);
        var sensor = data[0];
        var property = data[1];
        var thing = data[2];

        if (!sensor.data.datastream_ids.some(function(entry) {return entry == self.data.id;})) {
          sensor.data.datastream_ids.push(self.data.id);
        }
        var sensorpromise = sensor.save();

        if (!property.data.datastream_ids.some(function(entry) {return entry == self.data.id;})) {
          property.data.datastream_ids.push(self.data.id);
        }
        var propertypromise = property.save();

        if (!thing.data.datastream_ids.some(function(entry) {return entry == self.data.id;})) {
          thing.data.datastream_ids.push(self.data.id);
        }
        var thingpromise = thing.save();

        return Promise.all([sensorpromise, propertypromise, thingpromise]);
      })
      .then(function(data) {
        return self;
      })
      .catch(function(error) {
        console.log("Error in Datastream.save(): ", error);
      });

  return dynamopromise;

};

Datastream.prototype.expandObservedProperty = function() {
  var self = this;

  var observedpropertypromise = ObservedProperty.findById(self.data.observedproperty_id);
  observedpropertypromise
    .then(function(observedproperty) {self.data.ObservedProperty = observedproperty.data;})
    .catch(function(error) {console.log("error expanding ObservedProperty: ", error);});

  return observedpropertypromise;
}

Datastream.list = function (top, start) {

  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: "sensorplane_datastreams",
    Limit: top,
    Select: "ALL_ATTRIBUTES"
  };

  if (start!=null) {
    params.ExclusiveStartKey = {"id": start};
  }

  var dynamopromise = docClient.scan(params)
                                  .promise()
                                  .then(function(data) {
                                    
                                    var response = {};
                                    response.LastEvaluatedKey = data.LastEvaluatedKey;
                                    response.records = [];
                                    data.Items.forEach(function(data) {
                                      response.records.push(new Datastream(data));
                                    });
                                    return response;
                                  });
   return dynamopromise;

}

Datastream.findById = function (datastream_id) {

  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: "sensorplane_datastreams",
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames: {
      "#id": "id"
    },
    ExpressionAttributeValues: {
         ":id": datastream_id
    }
  };

  var dynamopromise = docClient.query(params)
                                .promise()
                                .then(function(datastreamdata) {
                                  var observedpropertypromise = ObservedProperty.findById(datastreamdata.Items[0].observedproperty_id);
                                  return Promise.all([datastreamdata, observedpropertypromise])
                                })
                                .then(function(data) {
                                  var sensorpromise = Sensor.findById(data[0].Items[0].sensor_id);
                                  return Promise.all([data[0], data[1], sensorpromise])
                                })                                
                                .then(function(data) {
                                  var datastream = new Datastream(data[0].Items[0]);
                                  datastream.data.ObservedProperty = data[1];
                                  datastream.data.Sensor = data[2];
                                  return datastream;
                                })
                                .catch(function(error) {console.log("Datastream.findById error:", error)});
  return dynamopromise;

}

Datastream.guid = function () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

module.exports = Datastream;

var ObservedProperty = require('model/ObservedProperty');
var Sensor = require('model/Sensor');
var Thing = require('model/Thing');