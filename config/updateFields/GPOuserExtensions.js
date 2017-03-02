//These are the fields that we will be updating in GPO
//also can pass mapping of item to array so you can send just single item of array to be pushed to array
module.exports = {
  fields: [
    'sponsors',
    'entitlements'
  ],
  arrays: {
    sponsor: 'sponsors',
    entitlement: 'entitlements'
  },
};
