if (typeof egam == 'undefined') {
  var egam = {};
}
if (typeof egam.pages == 'undefined') {
  egam.pages = {};
}
if (typeof egam.models == 'undefined') {
  egam.models = {};
}

//Place to stash the gpoUsers models for now
//Note the actual instance of the page models are in egam.pages so gpoItems page
//instance is egam.pages.gpoUsers
//When AMD is implemented we won't need so much .(dot) namespacing for the
//model, utility and control classes. They will be in directories
egam.models.gpoItemCheckList = {};

//Data here is the actual array of JSON documents that came back from the REST endpoint
egam.models.gpoItemCheckList.PageModelClass = function() {
  var self = this;

  self.$tableElement = $('#gpoItemsChecklistTable');
  self.$pageElement = $('#checkListModal');
  

  self.sponsoreeAuthGroups = ko.observableArray(
      egam.communityUser.authGroups);
  self.confirm = ko.observable();

  //Only these fields will be returned from gpoItems/list endpoint
  self.resultFields = {
    _id: 1,
    submission: 1,
    approval: 1,
  };

  //This is instance of the table class that does all the table stuff.
  //Pass empty array of items initially
   self.table = new egam.controls.Table([],
     self.$tableElement,egam.models.gpoItemCheckList.RowModelClass);


  //Set up the details control now which is part of this Model Class
  self.details = new egam.models.gpoItemCheckList.DetailsModel(self);
  //self.details = new egam.models.gpoItemCheckList.RequestModel(self);

  self.pendingCount = ko.observable();
};

egam.models.gpoItemCheckList.PageModelClass.prototype.init = function() {
  console.log("gpoItemCheckList init");

  var self = this;
  var defer = $.Deferred();

  //Only run init once for page/model
  if (self.model) {
    defer.resolve();
    return defer;
  }
  // //Apply the bindings for the page now
  ko.applyBindings(self, self.$pageElement[0]);
  console.log('Bindings Applied: ' + new Date());

  // //Now initialize the table. ie. download data and create table rows
  // //the payload can be reduced if resultFields array was set
  var fields = this.resultFields || {};

  var query = null;
  var projection = null;
  // var projection = {
  //   sort: {
  //     modified: -1,
  //   },
  //   fields: fields,};
  //
  return self.table.init('gpochecklists/list', query, projection)
    //After table is loaded we can do other stuff
    .then(function() {
      self.numOfChecklists();

      //on close with out clear checkboxes
      $('#checkListModal').on('hidden.bs.modal', function(e) {
        self.confirm(false);
        //egam.pages.gpoItems.table.uncheckAll();
      });

       defer.resolve();
     });

   return defer;
};
//This is for Testing purposes. Will remove later
egam.models.gpoItemCheckList.PageModelClass.prototype.allItemsCheck = function(item,evt) {
  var self = this;
  console.log(self.table);
  //var displayedItems = self.dataTable.rows({search: 'applied'}).data();

  return true;
};

egam.models.gpoItemCheckList.PageModelClass.prototype.numOfChecklists = function() {
  var self = this;
  var data = self.table.data;
  var checklistCount = 0;
  //need to loop through data
  data.forEach(function(doc, index) {
    if (doc.approval.status == 'pending') {
      checklistCount++;
    }
  });

  self.pendingCount(checklistCount);
  egam.pages.gpoItems.pendingChecklistCount(self.pendingCount());
  //If we want to get count directly from dataTabel
  //egam.pages.gpoItems.table.dataTable.rows({search:"applied"}).data()

};

egam.models.gpoItemCheckList.PageModelClass.prototype.update = function(){
  var self = this;
  
  var checkListName = $('#requestName').val();
  // Get assigned authGroup from dropdown
  var reqAuthDrop = $('#RequestAuthGroup');
  var authGroup = reqAuthDrop[0]
      .options[reqAuthDrop[0].selectedIndex].value;
  
  var submitPublicRequest = {submission : {
                                name: checkListName,
                                items: egam.pages.gpoItems.table.checkedRows(),
                                authGroup: authGroup}};

  var updateChck = {updateDocs: JSON.stringify(submitPublicRequest)};
  console.log(JSON.stringify(submitPublicRequest));

  // Post to mongo
  $.ajax({
    url: 'gpochecklists/update',
    type: 'POST',
    data: updateChck,
    cache: false,
    dataType: 'json',
    success: function(rdata, textStatus, jqXHR) {
      console.log('Success: Posted new checklist to Mongo');

      //update checklist count
      var requestCount = self.pendingCount();
      requestCount++;
      self.pendingCount(requestCount);
      egam.pages.gpoItems.pendingChecklistCount(self.pendingCount());
      //update checklist table
      var query = null;
      var projection = null;
      self.table.init('gpochecklists/list', query, projection);
      
    },
    error: function(jqXHR, textStatus, errorThrown) {
      // Handle errors here
      console.log('ERRORS: ' + textStatus);

    },
  });
  $('#checkListModal').modal('hide');
  //clear checks on gpoItems table
};
//This is limited model which is used for the table rows. It is condensed so that table loads faster
egam.models.gpoItemCheckList.RowModelClass = function(doc, index) {
  var self = this;
  //This is the doc
  this.doc = ko.observable(doc);
  //To keep track of this row when selected
  this.index = index;

};

//This is the FULL model which binds to the modal allowing 2 way data binding and updating etc
egam.models.gpoItemCheckList.FullModelClass = function(doc, index, parent) {
  var self = this;
  //The pageModel this belows to
  this.parent = parent;
  //The index in array for this item
  this.index = index;
  //This is the doc
  this.doc = ko.observable(ko.mapping.fromJS(ko.utils.unwrapObservable(doc)));

  //Could Add a computed observable to store Checklist item names with the ids
  //http://localhost:3000/gpdashboard/gpoItems/list?query={%22id%22:{%22$in%22:[%2240894bca74de46d4b92abd8fd0a5160e%22]}}&projection={%22fields%22:{%22id%22:1,%22title%22:1}}

};

//Data here is the actual array of JSON documents that came back from the
//REST endpoint
egam.models.gpoItemCheckList.DetailsModel = function(parent) {
  var self = this;
  self.parent = parent;

  self.$element = $('gpoCheckListDetailsModal');
  this.bound = false;
  //A new observable for the selected row storing the FULL gpoItem model
  self.selected = ko.observable();

};

//On the entire table, we need to know which item is selected to use later with
//modal, etc.
egam.models.gpoItemCheckList.DetailsModel.prototype.select = function(item) {
  var self = this;

  var fullRowModel = new egam.models.gpoItemCheckList.FullModelClass(item.doc, item.index, self);
  self.selected(fullRowModel);

  if (!self.bound) {
    ko.applyBindings(self, document.getElementById('gpoCheckListDetailsModal'));
    self.bound = true;
  }
};

//Post to mongo to make items public
egam.models.gpoItemCheckList.DetailsModel.prototype.makeChecklistPublic = function(item) {
  var self = this;
  //object to send to endpoint for request to make an checklist public
  //localhost/gpdashboard/gpochecklists/update?updateDocs={"_id":"577c3677f54235d82ebbc4b3","approval":{"status":"approved","ISOemail":"iso@test.com","IMOemail":"imo@test.com"}}
  var approvalPost = {
    _id: item.selected().doc()._id(),
    approval: {
      status: 'approved',
      ISOemail: 'ISOemail',
      IMOemail: 'IMOemail'
    }
  };
  var publicApproval = {updateDocs:JSON.stringify(approvalPost)};

  // Post to mongo
  $.ajax({
    url: 'gpochecklists/update',
    type: 'POST',
    data: publicApproval,
    cache: false,
    dataType: 'json',
    success: function(rdata, textStatus, jqXHR) {
      console.log('Success: Checklist approved');

      //increment request count
      var requestCount = self.parent.pendingCount();
      requestCount--;
      self.parent.pendingCount(requestCount);
      egam.pages.gpoItems.pendingChecklistCount(self.parent.pendingCount());

      //update checklist table
      item.selected().doc().approval.status('approved');
      var jsDoc = ko.mapping.toJS(item.selected().doc());
      self.parent.table.update(item.selected().index, jsDoc, 'doc');
    },
    error: function(jqXHR, textStatus, errorThrown) {
      // Handle errors here
      console.log('ERRORS: ' + textStatus);
    },
  });

  $('#gpoCheckListDetailsModal').modal('hide');
};

//Allows you to select an item based on index, usually index will be coming from row number
egam.models.gpoItemCheckList.DetailsModel.prototype.selectIndex = function(index) {
  this.select(this.parent.table.items[index]);
};

// egam.models.gpoItemCheckList.PageModelClass.prototype.check = function(item, evt) {
//
//   console.log(item);
// };

egam.models.gpoItemCheckList.PageModelClass.prototype.showGPOCheckList = function() {

  //make only request elements show
  $('#requestElements').show();
  $('#adminElements').hide();
  $('#requestConfirm').show();
  $('#checkListModal').modal('toggle');
  return true;
};

egam.models.gpoItemCheckList.PageModelClass.prototype.adminCheckLists = function() {
  $('#requestElements').hide();
  $('#requestConfirm').hide();
  $('#adminElements').show();
  $('#checkListModal').modal('toggle');
  return true;
};



