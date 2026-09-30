const fs = require('fs');

const homePath = 'client/src/pages/Home.tsx';
let home = fs.readFileSync(homePath, 'utf8');
home = home.replace(
  /<p>Choose a demo role to explore the first working layer of LandStack\.<\/p>/g,
  '<p>Choose a role to explore the first working layer of LandStack.</p>'
);
fs.writeFileSync(homePath, home);

const loginPath = 'client/src/pages/Login.tsx';
let login = fs.readFileSync(loginPath, 'utf8');
login = login.replace(/officer@demo\.landsphere\.ai/g, 'officer@landsphere.ai');
login = login.replace(/resident@demo\.landsphere\.ai/g, 'resident@landsphere.ai');
login = login.replace(/Demo \$\{role\} access granted/g, '${role} access granted');
login = login.replace(/defaultValue="demo-password"/g, 'defaultValue="password"');
login = login.replace(/Synthetic Sentinel demo/g, 'Synthetic Sentinel');
login = login.replace(/Synthetic Landsat demo/g, 'Synthetic Landsat');
fs.writeFileSync(loginPath, login);
console.log("Updated Home and Login text");
