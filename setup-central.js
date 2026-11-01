'use strict';
const readline=require('node:readline/promises');
(async()=>{const rl=readline.createInterface({input:process.stdin,output:process.stdout});try{const url=new URL((await rl.question('Published SAVAGE MD Central site URL: ')).trim());if(url.protocol!=='https:')throw Error('Use the published HTTPS address.');require('./central').reporter().configure(url.origin);console.log('Central address saved. Start the bot with npm start.')}catch(e){console.error(e.message);process.exitCode=1}finally{rl.close()}})();
