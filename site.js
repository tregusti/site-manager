#!/usr/bin/env node

var Path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var dust = require('dust');
var mkdirp = require('mkdirp');

var root, www, nginx;

exec('hostname', function(error, stdout) {
  root = '/';
  
  // If local dev, then fake root of system.
  if (stdout.trim() === 'Fenrir.local') {
    root = __dirname + "/tmp/";
  }
  
  www = root + "var/www/";
  nginx = root + "etc/nginx/"
  
  if (root !== '/') {
    // If in faked system, create test dirs.
    mkdirp.sync(nginx + 'sites-available', 0755);
    mkdirp.sync(nginx + 'sites-enabled', 0755);
    mkdirp.sync(nginx + 'conf', 0755);
    mkdirp.sync(www, 0755);
  }
  
  // Start parsing the command
  parse(process.argv.slice(2));
});

function parse(args) {
  var cmd = args.shift();
  loadTemplates();  
  switch (cmd) {
    case 'create':
      create(args.shift());
      break;
    case 'list':
      list();
      break;
    case 'enable':
      enable(args.shift());
      break;
    case 'disable':
      disable(args.shift());
      break;
    default:
      usage();
      break;
  }
}

function list() {
  var available = fs.readdirSync(nginx + 'sites-available');

  if (!available.length) {
    p('No sites available, create one with:\n\n  ./site create <name>\n');
    return;
  }
  p('Available sites:');
    
  var enabled = fs.readdirSync(nginx + 'sites-enabled');
  available.forEach(function(site) {
    p(site);
  });
}

function create(name) {
  if (Path.existsSync(www + name) || Path.existsSync(nginx + "sites-available/" + name)) {
    p("Already present.");
    return;
  }
  
  dust.render('nginx', { domain: name }, function(err, out) {
    // create some folders
    'log public config'.split(' ').forEach(function(dir) {
      mkdirp.sync(www + name + '/' + dir, 0755);
    });
    // Save path to nginx conf file
    var conf = www + name + '/config/nginx.conf';
    // create nginx config file
    fs.writeFileSync(conf, out);
    // symlink it to the nginx sites confs dir
    fs.symlinkSync(conf, nginx + "sites-available/" + name);
  });
}

function usage() {
  p("Usage: ");
};
function p(str) {
  console.log(str);
}
function loadTemplates() {
  // Prevent white space collapsing.
  dust.optimizers.format = function(ctx, node) { return node };
  
  fs.readdirSync("templates").forEach(function(file) {
    var src = fs.readFileSync('templates/' + file, 'utf8');
    var name = Path.basename(file).substr(0, Path.extname(file).length);
    dust.loadSource(dust.compile(src, name));
  });
}