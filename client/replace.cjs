const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk('c:/Users/thiru/Downloads/landsphere-ai/client/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/LandSphere/g, 'LandStack');
  content = content.replace(/landsphere\.ai/g, 'landstack.app');
  content = content.replace(/LANDSPHERE/g, 'LANDSTACK');

  content = content.replace(/Demo download centre is ready/g, 'Download centre is ready');
  content = content.replace(/Demo document download prepared/g, 'Document download prepared');
  content = content.replace(/Demo document preview/g, 'Document preview');
  content = content.replace(/selected demo parcel covers/g, 'selected parcel covers');
  content = content.replace(/Demo profile edit mode enabled/g, 'Profile edit mode enabled');
  content = content.replace(/kicker="DEMO CITIZEN"/g, 'kicker="CITIZEN PROFILE"');
  content = content.replace(/for the demo/g, 'for the platform');
  content = content.replace(/LIVE DEMO EXTENT/g, 'LIVE EXTENT');
  content = content.replace(/Registered demo parcels/g, 'Registered parcels');
  content = content.replace(/for demonstration only/g, 'for evaluation only');
  content = content.replace(/kicker="DEMO INDICATORS"/g, 'kicker="RISK INDICATORS"');
  content = content.replace(/Demo Officer/g, 'Assigned Officer');
  content = content.replace(/synthetic demo report/g, 'synthetic report');
  content = content.replace(/Demo download prepared/g, 'Download prepared');
  content = content.replace(/synthetic demo records/g, 'synthetic records');
  content = content.replace(/Demo Workspace/g, 'Workspace');

  // Let's also check if "Demo" or "demo" is left in some visible places
  // but we shouldn't replace "demo" in variables like "demoParcels" or "demoData"
  // So we'll skip aggressive blind replace for "Demo".

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
