module.exports = {
    patch : [
        {port:1080,dest:'tcp://localhost:10800',remote:'ws://localhost:5001'}
    ],
};