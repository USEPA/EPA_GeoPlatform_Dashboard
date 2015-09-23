var mongoDBurl='';
module.exports = {
    AGOLorgID: "cJ9YHowT8TU7DUyn",
    AGOLadminCredentials:
    {username: "",password: ""},
    portal: "https://epa.maps.arcgis.com",
//saveUninitialized:false,resave:false limits resaving of session data that is unchanged or uninitialized
    sessionOptions: {secret:"",saveUninitialized:false,resave:false},
//touchAfter: 24*3600 means only update session one time in 24 hrs instead of every refresh (unless session data is changed of course)
    mongoStoreOption: {url: mongoDBurl,touchAfter: 24 * 3600},
    mongoDBurl: mongoDBurl,
    maxRowLimit: 100
};