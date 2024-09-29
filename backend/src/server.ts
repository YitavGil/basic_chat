import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",  // זה מאפשר גישה מכל מקור. בסביבת ייצור, הגדר זאת לדומיין הספציפי שלך.
    methods: ["GET", "POST"]
  }
});

interface User {
  id: string;
  name: string;
  room: string;
}

const users: User[] = [];

app.use(cors());  // מאפשר CORS עבור כל הבקשות HTTP
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket: Socket) => {
  console.log('משתמש התחבר');

  socket.on('join', ({ name, room }: { name: string; room: string }) => {
    const user: User = { id: socket.id, name, room };
    users.push(user);
    socket.join(user.room);

    socket.emit('message', { user: 'מערכת', text: `${user.name}, ברוך הבא לחדר ${user.room}!` });
    socket.broadcast.to(user.room).emit('message', { user: 'מערכת', text: `${user.name} הצטרף לחדר!` });

    io.to(user.room).emit('roomData', { room: user.room, users: users.filter(u => u.room === user.room) });
  });

  socket.on('sendMessage', (message: string) => {
    const user = users.find(user => user.id === socket.id);
    if (user) {
      io.to(user.room).emit('message', { user: user.name, text: message });
    }
  });

  socket.on('typing', (isTyping: boolean) => {
    const user = users.find(user => user.id === socket.id);
    if (user) {
      socket.broadcast.to(user.room).emit('typing', { user: user.name, isTyping });
    }
  });

  socket.on('disconnect', () => {
    const index = users.findIndex(user => user.id === socket.id);
    if (index !== -1) {
      const user = users.splice(index, 1)[0];
      io.to(user.room).emit('message', { user: 'מערכת', text: `${user.name} עזב את החדר.` });
      io.to(user.room).emit('roomData', { room: user.room, users: users.filter(u => u.room === user.room) });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`השרת פועל על פורט ${PORT}`));