import * as crypto from 'crypto';
import fs from 'fs'

//key是32位 iv是16位
export function encrypt(data, key, iv) {
  let cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
}

export function decrypt(crypted, key, iv) {
  let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return decipher.update(crypted, 'hex', 'utf8') + decipher.final('utf8')
}

const args = process.argv.slice(2);
console.log(args)
if (args[0] == 0) {
  console.log(encrypt(args[1], args[2], args[3]))
}
if (args[0] == 1) {
  console.log(decrypt(args[1], args[2], args[3]))
}

function processCSV(inputFile, outputFile) {
  const results = [];
  try {
    const data = fs.readFileSync(inputFile, 'utf8');
    data.split('\n').forEach((line) => {
      const columns = line.split(',');
      columns[5] = decrypt(columns[4], args[3], args[4]); // 复制第4列的内容到第5列
      results.push(columns.join(','));
    });

    fs.writeFileSync(outputFile, results.join('\n'));
    console.log('处理完成');
  } catch (error) {
    console.error(error);
  }
}