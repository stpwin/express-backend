module.exports = {
    secret: process.env.NODE_ENV === 'production' ? process.env.SECRET : 'secret',
    expireDay: process.env.NODE_ENV === 'production' ? process.env.EXPIRE_DAY : 60
};