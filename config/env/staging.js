var mongoDBurl = '';
module.exports = {
    AGOLadminCredentials:
    {username: "",password: ""}
    ,sessionOptions: {secret:""}
//touchAfter: 24*3600 means only update session one time in 24 hrs instead of every refresh (unless session data is changed of course)
    ,mongoStoreOption: {url: mongoDBurl}
    ,mongoDBurl: mongoDBurl
};