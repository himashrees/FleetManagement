const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on('track_vehicle', (vehicle_id) => socket.join(`vehicle_${vehicle_id}`));
    socket.on('stop_tracking', (vehicle_id) => socket.leave(`vehicle_${vehicle_id}`));
    socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.id}`));
  });
};
module.exports = setupSocket;