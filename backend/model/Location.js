'use strict';
var AWS = require("aws-sdk");

var Location = function (data) {
  this.data = data;
  if (this.data.id == null) {this.data.id = Location.guid();}
}

Location.prototype.data = {}

Location.prototype.renderAPIOutput = function(baseurl) {

  console.log("render Location", this.data);

  var record = {};
  record["@iot.id"] = this.data.id;
  record["@iot.selfLink"] = baseurl+"/Locations/"+this.data.id;
  record["description"] = this.data.description;
  record["name"] = this.data.name; 
  record["encodingType"] = this.data.encodingType;
  record["location"] = this.data.location;
  record["Things@iot.navigationLink"] = baseurl+"/Locations/"+this.data.id+"/Things";
  record["HistoricalLocations@iot.navigationLink"] = baseurl+"/Locations/"+this.data.id+"/HistoricalLocations";
  return record;

}


Location.prototype.save = function(author) {

  var self = this;
  console.log("save location ID", this.data.id);

  this.data.authors = [author];

  var docClient = new AWS.DynamoDB.DocumentClient();
  var dynamopromise = docClient.put(
        {
        "TableName": "sensorplane_locations",
        "Item" : this.data
        })
      .promise()
      .then(function() {
        console.log("stored to Dynamo: ", self.data);
        //return new Location(data);
        return self;
      });

  return dynamopromise;

};

Location.findById = function (location_id) {

  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: "sensorplane_locations",
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames: {
      "#id": "id"
    },
    ExpressionAttributeValues: {
         ":id": location_id
    }
  };

  var dynamopromise = docClient.query(params)
                                .promise()
                                .then(function(data) {
                                  //console.log("loaded from Dynamo: ", data.Items[0]);
                                  return new Location(data.Items[0]);
                                });
  return dynamopromise;

}

Location.list = function (top, start) {

  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: "sensorplane_locations",
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
                                      response.records.push(new Location(data));
                                    });
                                    return response;
                                  });
   return dynamopromise;

}

Location.guid = function () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

module.exports = Location;
