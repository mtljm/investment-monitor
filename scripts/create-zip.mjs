import {deflateRawSync} from 'node:zlib';
const table=Array.from({length:256},(_,i)=>{
  let c=i;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);return c>>>0;
});
function crc32(data){let crc=0xffffffff;for(const byte of data)crc=(crc>>>8)^table[(crc^byte)&255];return (crc^0xffffffff)>>>0;}
export function createZip(entries){
  const local=[],central=[],names=new Set();let offset=0,total=0;
  for(const entry of entries){
    if(!/^[A-Za-z0-9._-]+$/.test(entry.name)||names.has(entry.name))throw new Error('Invalid ZIP entry name');
    names.add(entry.name);const name=Buffer.from(entry.name),data=Buffer.from(entry.bytes);
    total+=data.length;if(total>10*1024*1024)throw new Error('ZIP input exceeds 10MB');
    const packed=deflateRawSync(data),crc=crc32(data);
    const header=Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);
    header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);
    header.writeUInt32LE(crc,14);header.writeUInt32LE(packed.length,18);
    header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
    local.push(header,name,packed);
    const record=Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50,0);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);
    record.writeUInt16LE(0x800,8);record.writeUInt16LE(8,10);record.writeUInt16LE(33,14);
    record.writeUInt32LE(crc,16);record.writeUInt32LE(packed.length,20);
    record.writeUInt32LE(data.length,24);record.writeUInt16LE(name.length,28);
    record.writeUInt32LE(offset,42);central.push(record,name);
    offset+=header.length+name.length+packed.length;
  }
  if(!entries.length||entries.length>100)throw new Error('Invalid ZIP entry count');
  const directory=Buffer.concat(central),end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);
  end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}
