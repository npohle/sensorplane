'use strict';
var AWS = require("aws-sdk");

var Sensor = function (data) {
  this.data = data;
  if (this.data.datastream_ids == undefined) {this.data.datastream_ids = [];}
}

Sensor.prototype.data = {}

Sensor.prototype.renderAPIOutput = function(baseurl) {

  var record = {};
  record["@iot.id"] = this.data.id;
  record["@iot.selfLink"] = baseurl+"/Sensors/"+this.data.id;
  record["description"] = this.data.description;
  record["name"] = this.data.name;
  record["encodingType"] = this.data.encodingType;
  record["metadata"] = this.data.metadata;
  record["Datastreams@iot.navigationLink"] = baseurl+"/Sensors/"+this.data.id+"/Datastreams";

  return record;

}

Sensor.prototype.save = function(author) {

  console.log("save location ID", this.data.id);

  if (author!=null) {this.data.authors = [author];}

  var docClient = new AWS.DynamoDB.DocumentClient();
  var dynamopromise = docClient.put(
        {
        "TableName": "sensorplane_sensors",
        "Item" : this.data
        })
      .promise()
      .then(function(data) {
        console.log("stored to Dynamo: ", data);
        return new Sensor(data);
      });

  return dynamopromise;

};

Sensor.list = function (top, start) {

  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: "sensorplane_sensors",
    Limit: top,
    Select: "ALL_ATTRIBUTES"
  };

   var dynamopromise = docClient.scan(params)
                                  .promise()
                                  .then(function(data) {
                                    
                                    var response = {};
                                    response.LastEvaluatedKey = data.LastEvaluatedKey;
                                    response.records = [];
                                    data.Items.forEach(function(data) {
                                      response.records.push(new Sensor(data));
                                    });
                                    return response;
                                  });
   return dynamopromise;

}

Sensor.findById = function (sensor_id) {

  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: "sensorplane_sensors",
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames: {
      "#id": "id"
    },
    ExpressionAttributeValues: {
         ":id": sensor_id
    }
  };

  var dynamopromise = docClient.query(params)
                                .promise()
                                .then(function(data) {
                                  //console.log("loaded from Dynamo: ", data.Items[0]);
                                  return new Sensor(data.Items[0]);
                                });
  return dynamopromise;

}

module.exports = Sensor;
