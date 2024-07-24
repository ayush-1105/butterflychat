import React, { useEffect, useRef, useState } from 'react';
import './App.css';

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import 'firebase/compat/analytics';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';

firebase.initializeApp({
  apiKey: "AIzaSyBbCqrGT-Ny7tIXd-HiCRrKxjbqzDExL2A",
  authDomain: "butterflychat-dc0bc.firebaseapp.com",
  projectId: "butterflychat-dc0bc",
  storageBucket: "butterflychat-dc0bc.appspot.com",
  messagingSenderId: "1065184257367",
  appId: "1:1065184257367:web:684bcc14e4da1ce11a4a12",
  measurementId: "G-LQQ1CYHN9D"
});

const auth = firebase.auth();
const firestore = firebase.firestore();
const analytics = firebase.analytics();

function App() {
  const [user] = useAuthState(auth);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomName, setRoomName] = useState('');

  useEffect(() => {
    if (selectedRoom) {
      const unsubscribe = firestore.collection('chatRooms').doc(selectedRoom).onSnapshot(doc => {
        setRoomName(doc.data()?.name || 'Chat Room');
      });
      return () => unsubscribe();
    }
  }, [selectedRoom]);

  return (
    <div className="App">
      <header>
        <h1>{roomName ? `🦋💬 ${roomName}` : '🦋💬'}</h1>
        {selectedRoom ? (
          <button className="back-to-list" onClick={() => setSelectedRoom(null)}>Back to Room List</button>
        ) : (
          <SignOut />
        )}
      </header>

      <section>
        {user ? (
          selectedRoom ? (
            <ChatRoom roomId={selectedRoom} />
          ) : (
            <>
              <CreateChatRoom onRoomCreated={() => setSelectedRoom(null)} />
              <RecentChatRooms onJoin={setSelectedRoom} />
            </>
          )
        ) : (
          <SignIn />
        )}
      </section>
    </div>
  );
}

function SignIn() {
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
    } catch (error) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.log('Popup request cancelled due to another conflicting popup being opened.');
      } else {
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="sign-in" onClick={signInWithGoogle} disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </button>
    </>
  );
}

function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => auth.signOut()}>Sign Out</button>
  );
}

function CreateChatRoom({ onRoomCreated }) {
  const [roomName, setRoomName] = useState('');

  const createRoom = async (e) => {
    e.preventDefault();
    try {
      await firestore.collection('chatRooms').add({
        name: roomName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setRoomName('');
      onRoomCreated();
    } catch (error) {
      console.error("Error creating chat room: ", error);
    }
  };

  return (
    <form onSubmit={createRoom}>
      <input
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        placeholder="Chat Room Name"
        required
      />
      <button type="submit">Create Room</button>
    </form>
  );
}

function RecentChatRooms({ onJoin }) {
  const [chatRooms, setChatRooms] = useState([]);

  useEffect(() => {
    const unsubscribe = firestore.collection('chatRooms').orderBy('createdAt', 'desc').limit(5).onSnapshot(snapshot => {
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChatRooms(rooms);
    });
    return () => unsubscribe();
  }, []);

  return (
    <ul>
      {chatRooms.map(room => (
        <li key={room.id} onClick={() => onJoin(room.id)}>
          {room.name}
        </li>
      ))}
    </ul>
  );
}

function ChatRoom({ roomId }) {
  const dummy = useRef();
  const messagesRef = firestore.collection('chatRooms').doc(roomId).collection('messages');
  const query = messagesRef.orderBy('createdAt').limit(25);

  const [messages] = useCollectionData(query, { idField: 'id' });
  const [formValue, setFormValue] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

    await messagesRef.add({
      text: formValue,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid,
      photoURL
    });

    setFormValue('');
    dummy.current.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (dummy.current) {
      dummy.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <>
      <main>
        {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        <span ref={dummy}></span>
      </main>

      <form onSubmit={sendMessage}>
        <input 
          value={formValue} 
          onChange={(e) => setFormValue(e.target.value)} 
          placeholder="Type your message..." 
        />
        <button type="submit" disabled={!formValue}>Send</button>
      </form>
    </>
  );
}

function ChatMessage(props) {
  const { text, uid, photoURL } = props.message;
  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return (
    <div className={`message ${messageClass}`}>
      <img src={photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} alt="Avatar" />
      <p>{text}</p>
    </div>
  );
}

export default App;
