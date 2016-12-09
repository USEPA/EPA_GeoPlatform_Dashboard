module.exports = {
  apps : [{
    name  : "egam",
    script  : "../bin/www",
    instances : 2,
    exec_mode  : "cluster"
  }]
};