module.exports = {
    patch : [
        {port:5000,dest:'tcp://localhost:22',remote:'ws://localhost:5001'}
    ],
};