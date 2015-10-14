var TasksQueues =  function(minTime){
  this.queues = {};
  this.minTime = 500 | minTime;
};


TasksQueues.prototype.add = function (type,promise,arg) {
  var TasksQueues = require('tasks-queue');

//If the task type has not been assigned to process yet then do it
  var tq;
  if (!(type in this.queues)) {
    tq = new TasksQueues({autostop:false});
    this.queues[type]=tq;
// The queue should not execute more than one task in minTime ms.
    tq.setMinTime(this.minTime);
    tq.on("process",this.getProcess());
    tq.execute();
  }else {
    tq = this.queues[type];
  }
//allows promise to be called with an argument
  var data = {promise:promise,arg:arg};
//add the promise to queue for type
  tq.pushTask("process",data);
};

TasksQueues.prototype.getProcess = function () {
  var self=this;
  return function process(jinn, data) {
    data.promise(data.arg).done(
      function () {
        var length = jinn.getQueue().length();
//Mark this task as done
//        console.log("Pre Task Count for: " + data.arg.task + " is: " + jinn.getQueue().length());
        jinn.done(); // important!
//        console.log("Post Task Count for: " + data.arg.task + " is: " + jinn.getQueue().length());
//If nothing left in this task queue then get rid of task queue
//Uncomment this if we think having too many queues for each user is using too much memory
        if (length<1) delete self.queues[data.arg.task];
      });
  };
};


module.exports = TasksQueues;
