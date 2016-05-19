//These are the fields that we will be updating in GPO
module.exports = {
  fields: [
    'fullName',
    'email',
  ],
  arrays: {
  },
  sets: {
    authGroup: 'authGroups',
  },
};
