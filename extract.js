const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];
fs.writeFileSync('test.js', script);
