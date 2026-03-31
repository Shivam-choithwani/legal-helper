import dns from 'dns/promises';

const res = await dns.resolveSrv('_mongodb._tcp.cluster0.u0mlizg.mongodb.net');
console.log(res);