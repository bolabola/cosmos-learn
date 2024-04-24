import crypto from "crypto";

export function decrypt(crypted, key, iv) {
    let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return decipher.update(crypted, 'hex', 'utf8') + decipher.final('utf8')
}