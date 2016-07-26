//These are the fields that we will be updating in GPO
//The GPOchecklists doc is broken up between the submission (by the owner) and approval (by the admin)
//Will make it easier to seperate privileges
module.exports = [
  'submission.name',
  'submission.items',
  'submission.owner',
  'submission.submitDate',
  'submission.authGroup',
  'approval.status',
  'approval.admin',
  'approval.statusDate',
  'approval.ISOemail',
  'approval.IMOemail'
];

