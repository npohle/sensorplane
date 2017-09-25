'use strict';
var AWS = require("aws-sdk");

var ObservedProperty = function (data) {
  this.data = data;
  if (this.data.datastream_ids == undefined) {this.data.datastream_ids = [];}
}

ObservedProperty.prototype.data = {}

ObservedProperty.prototype.renderAPIOutput = function(baseurl) {

  var record = {};
  record["@iot.id"] = this.data.id;
  record["@iot.selfLink"] = baseurl+"/ObservedProperties/"+this.data.id;
  record["description"] = this.data.description;
  record["definition"] = this.data.defnition;
  record["name"] = this.data.name;
  record["Datastreams@iot.navigationLink"] = baseurl+"/ObservedProperties/"+this.data.id+"/Datastreams";
  return record;

}

ObservedProperty.prototype.save = function(author) {

  console.log("save ObservedProperty ID", this.data.id);

  if (author!=null) {this.data.authors = [author];}

  var docClient = new AWS.DynamoDB.DocumentClient();
  var dynamopromise = docClient.put(
        {
        "TableName": "sensorplane_observedproperties",
        "Item" : this.data
        })
      .promise()
      .then(function(data) {
        console.log("stored to Dynamo: ", data);
        return new ObservedProperty(data);
      });

  return dynamopromise;

};

ObservedProperty.list = function (top, start) {

  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: "sensorplane_observedproperties",
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
                                      response.records.push(new ObservedProperty(data));
                                    });
                                    return response;
                                  });
   return dynamopromise;

}

ObservedProperty.findById = function (property_id) {

  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: "sensorplane_observedproperties",
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames: {
      "#id": "id"
    },
    ExpressionAttributeValues: {
         ":id": property_id
    }
  };

  var dynamopromise = docClient.query(params)
                                .promise()
                                .then(function(data) {
                                  //console.log("loaded from Dynamo: ", data.Items[0]);
                                  return new ObservedProperty(data.Items[0]);
                                });
  return dynamopromise;

}

module.exports = ObservedProperty;
