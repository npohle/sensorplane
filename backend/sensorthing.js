'use strict';
var AWS = require("aws-sdk");
var sensorthing = require('sensorthing');

module.exports.thingsAll = (top, skip) => {

  var docClient = new AWS.DynamoDB.DocumentClient();
  var tableName = "sensorplane_things";

  var params = {
    TableName: "sensorplane_things",
    Limit: top,
    Select: "ALL_ATTRIBUTES"
  };

   var dynamopromise = docClient.scan(params).promise().then(function(data) {return data});
   return dynamopromise;
};

module.exports.thingByThingId = (thingid) => {

  var docClient = new AWS.DynamoDB.DocumentClient();
  var tableName = "sensorplane_things";

  var params = {
    TableName: "sensorplane_things",
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames: {
      "#id": "id"
    },
    ExpressionAttributeValues: {
         ":id": thingid
    }
  };

  var dynamopromise = docClient.query(params).promise().then(function(data) {return data});
  return dynamopromise;

};
