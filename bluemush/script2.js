function toggleMenu() {
    let sidebar = document.getElementById("sidebar");
    let overlay = document.getElementById("overlay");
    let menuToggle = document.getElementById("menuButton");
    let container = document.querySelector(".container");
    if (sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
        overlay.style.display = "none";
        menuToggle.style.display = "block";
        document.body.style.overflow = "";
        if(container) container.style.filter = "none";
    } else {
        sidebar.classList.add("active");
        overlay.style.display = "block";
        menuToggle.style.display = "none";
        document.body.style.overflow = "hidden";
        if(container) container.style.filter = "blur(3px)";
    }
}
window.toggleMenu = toggleMenu;

import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    updateProfile,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    getDoc,
    orderBy, 
    query, 
    serverTimestamp, 
    updateDoc, 
    deleteDoc,
    doc,
    increment,
    where,
    setDoc,
    Timestamp,
    limit,
    startAfter,
    endBefore,
    limitToLast,
    startAt,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBSOrPKyxH1agiOFks-hi8LyL2Xq7-gz1I",
    authDomain: "bluemushmomboard.firebaseapp.com",
    projectId: "bluemushmomboard",
    storageBucket: "bluemushmomboard.appspot.com",
    messagingSenderId: "353177129530",
    appId: "1:353177129530:web:a710b8838cbad90c8cdb03",
    measurementId: "G-NV5NWGZTW9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);
const toggleUsersBtn = document.getElementById('toggleUsers');
const userPopup = document.getElementById('userPopup');

let autoAnonymousLogin = true;
let replyToCommentId = null;
let currentUser = null;
let currentPostId = null;
let userNickname = null;
let userAvatarColor = "#4da6ff";
let selectedAvatarColor = "#4da6ff";
let currentPage = 1;
let postsPerPage = 10;
let totalPages = 1;
let lastVisiblePost = null;
let firstVisiblePost = null;
let allPosts = [];
let searchTerm = "";
let currentTab = "board";
let currentChannelId = null;
let lastCommentTime = 0;

const writeModal = document.getElementById("writeModal");
const viewModal = document.getElementById("viewModal");
const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const channelModal = document.getElementById("channelModal");
const viewChannelModal = document.getElementById("viewChannelModal");
const profileModal = document.getElementById("profileModal");

const boardTabBtn = document.getElementById("boardTabBtn");
const channelTabBtn = document.getElementById("channelTabBtn");
const boardTab = document.getElementById("boardTab");
const channelTab = document.getElementById("channelTab");

const writePostBtn = document.getElementById("writePostBtn");
const addChannelBtn = document.getElementById("addChannelBtn");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const paginationContainer = document.getElementById("pagination");

onAuthStateChanged(auth, (user) => {
    if (!user && autoAnonymousLogin) {
        signInAnonymously(auth)
        .then(() => {
            console.log("익명 로그인 성공");
        })
        .catch((error) => {
            console.error("익명 로그인 실패:", error);
        });
    } else {
        console.log("이미 로그인됨:", user ? user.uid : "없음");
    }
});

async function logoutUser1() {
    try {
        autoAnonymousLogin = false;
        await signOut(auth);
        showToast("로그아웃되었습니다.");
    } catch (error) {
        showToast(error.message);
    }
}

function renderCommentsTree(commentsArray) {
    const commentMap = {};
    commentsArray.forEach(comment => {
        comment.children = [];
        commentMap[comment.id] = comment;
    });
    const topLevelComments = [];
    commentsArray.forEach(comment => {
        if (comment.parentId) {
            if (commentMap[comment.parentId]) {
                commentMap[comment.parentId].children.push(comment);
            } else {
                topLevelComments.push(comment);
            }
        } else {
            topLevelComments.push(comment);
        }
    });
    return renderCommentList(topLevelComments, 0);
}

function renderCommentList(comments, indentLevel) {
    let html = "";
    comments.forEach(comment => {
        html += renderComment(comment, indentLevel);
        if (comment.children && comment.children.length > 0) {
            html += renderCommentList(comment.children, indentLevel + 20);
        }
    });
    return html;
}

function renderComment(comment, indentPx) {
    const formattedDate = formatDate(comment.timestamp);
    const avatarColor = comment.avatarColor || "#4da6ff";
    const authorInitial = getInitial(comment.nickname || comment.author);
    const isAuthor = currentUser && currentUser.uid === comment.authorId;
    const deleteFunction = comment.channelId ? `deleteChannelComment('${comment.id}')` : `deleteComment('${comment.id}')`;
    return `
                <div class="comment" style="margin-left: ${indentPx}px;">
                    <div class="comment-author">
                        <div class="user-avatar-sm" style="background-color: ${avatarColor}">${authorInitial}</div>
                        ${comment.nickname || comment.author}
                        <span style="font-weight: normal; font-size: 0.9em; margin-left: 10px;">${formattedDate}</span>
                        ${isAuthor ? `<button onclick="${deleteFunction}" style="margin-left: auto; background: #ff4d4d; border: none; color: white; padding: 2px 5px; border-radius: 3px; cursor: pointer;">삭제</button>` : ''}
                    </div>
                    <div>${comment.content}</div>
                    <button class="edit-btn" onclick="startReply('${comment.id}')">답글 달기</button>
                </div>
            `;
}

toggleUsersBtn.addEventListener('click', () => {
    if (userPopup.style.display === 'none' || userPopup.style.display === '') {
        userPopup.style.display = 'block';
    } else {
        userPopup.style.display = 'none';
    }
});

document.addEventListener('click', (event) => {
    if (!toggleUsersBtn.contains(event.target) && !userPopup.contains(event.target)) {
        userPopup.style.display = 'none';
    }
});

function startReply(commentId) {
    replyToCommentId = commentId;
    showToast("답글 모드 활성화: 선택된 댓글에 답글을 작성합니다.");
}

function formatDate(timestamp) {
    if (!timestamp) return "시간 없음";
    let date;
    if (typeof timestamp === 'number') {
        date = new Date(timestamp * 1000);
    } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else {
        return "시간 없음";
    }
    const hours = date.getHours().toString().padStart(2, '0'); 
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.innerText = message;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.background = "#333";
    toast.style.color = "white";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "5px";
    toast.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.3)";
    toast.style.opacity = "1";
    toast.style.transition = "opacity 0.5s ease-in-out";
    toast.style.zIndex = "9999";
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => document.body.removeChild(toast), 500);
    }, 2000);
}

function scrollToBottom() {
    const commentsContainer = document.getElementById("comments");
    if (commentsContainer) {
        setTimeout(() => {
            commentsContainer.scrollTop = commentsContainer.scrollHeight;
        }, 500);
    }
    const channelCommentsContainer = document.getElementById("channelComments");
    if (channelCommentsContainer) {
        setTimeout(() => {
            channelCommentsContainer.scrollTop = channelCommentsContainer.scrollHeight;
        }, 500);
    }
}

function getAnonymousId() {
    let anonId = localStorage.getItem('myAnonName');
    if (!anonId || !anonId.startsWith('블찾사-')) {
        anonId = '블찾사-' + Math.floor(1000 + Math.random() * 9000);
        localStorage.setItem('MyAnonName', anonId);
    }
    return anonId;
}

function initChat() {
    const database = getDatabase(app);
    let myId = "";
    if (currentUser) {
        if (currentUser && currentUser.isAnonymous) {
            myId = localStorage.getItem('myAnonName') || "블찾사-???";
        } else {
            myId = userNickname || (currentUser.email ? currentUser.email.split('@')[0] : "Guest");
        }
    } else {
        myId = getAnonymousId();
    }
    const onlineUsersRef = ref(database, 'onlineUsers/' + myId);
    set(onlineUsersRef, { id: myId, lastActive: Date.now() })
        .catch(error => console.error("온라인 상태 등록 오류:", error));
    onDisconnect(onlineUsersRef).remove();
    const chatMessagesRef = ref(database, 'chats');
    const chatButton = document.getElementById('chatButton');
    const chatPopup = document.getElementById('chatPopup');
    const closeChatBtn = document.getElementById('closeChat');
    closeChatBtn.addEventListener("click", () => {
        chatPopup.style.display = "none";
    });
    chatButton.addEventListener('click', () => {
        if (chatPopup.style.display === 'none' || chatPopup.style.display === '') {
            chatPopup.style.display = 'flex';
        } else {
            chatPopup.style.display = 'none';
        }
    });
    document.getElementById('popupChatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    document.getElementById('popupSendBtn').addEventListener('click', sendChatMessage);
    function sendChatMessage() {
        const input = document.getElementById('popupChatInput');
        let content = input.value.trim();
        if (!content) {
            showToast("메시지를 입력해주세요.");
            return;
        }
        content = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const message = {
            author: myId,
            content: content,
            timestamp: Date.now()
        };
        push(chatMessagesRef, message)
            .then(() => {
                input.value = "";
            })
            .catch(error => {
                console.error("메시지 전송 오류:", error);
                showToast("메시지 전송 중 오류가 발생했습니다.");
            });
    }
    const popupChatMessagesEl = document.getElementById('popupChatMessages');
    onChildAdded(chatMessagesRef, (data) => {
        const msg = data.val();
        const messageEl = document.createElement('div');
        messageEl.classList.add('chat-message');
        const date = new Date(msg.timestamp);
        const timeStr = date.getHours().toString().padStart(2, '0') + ':' +
                            date.getMinutes().toString().padStart(2, '0');
        messageEl.innerHTML = `<span class="author">${msg.author}</span>
                                    <span class="time">[${timeStr}]</span>: 
                                    ${msg.content}`;
        popupChatMessagesEl.appendChild(messageEl);
        const messageNodes = popupChatMessagesEl.querySelectorAll('.chat-message');
        if (messageNodes.length > 100) {
            popupChatMessagesEl.removeChild(messageNodes[0]);
        }
        popupChatMessagesEl.scrollTop = popupChatMessagesEl.scrollHeight;
    });
    const userListEl = document.getElementById('userList');
    const onlineUsersListenerRef = ref(database, 'onlineUsers');
    onValue(onlineUsersListenerRef, (snapshot) => {
        userListEl.innerHTML = "";
        const count = snapshot.size || 0;
        document.getElementById('userCount').textContent = count;
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            const userEl = document.createElement('div');
            userEl.classList.add('user-item');
            userEl.textContent = user.id;
            userListEl.appendChild(userEl);
        });
    });
}

function createAvatar(nickname, color) {
    const initial = nickname ? nickname.charAt(0).toUpperCase() : "?";
    return `<div class="user-avatar" style="background-color: ${color || '#4da6ff'}">${initial}</div>`;
}
function listenForCommentUpdates() {
    const commentsRef = collection(db, "comments");
    onSnapshot(commentsRef, (snapshot) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === "added") {
                const newComment = change.doc.data();
                if (newComment.parentId) {
                    checkIfReplyToMyComment(newComment.parentId);
                }
            }
        });
    });
}
async function checkIfReplyToMyComment(parentId) {
    if (!currentUser) return;
    try {
        const parentDoc = await getDoc(doc(db, "comments", parentId));
        if (parentDoc.exists()) {
            const parentData = parentDoc.data();
            if (parentData.authorId === currentUser.uid) {
                showToast("내 댓글에 답글이 달렸습니다!");
            }
        }
    } catch (error) {
        console.error("답글 알림 검사 오류:", error);
    }
}
function listenForChannelCommentUpdates() {
    const channelCommentsRef = collection(db, "channelComments");
    onSnapshot(channelCommentsRef, (snapshot) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === "added") {
                const newChannelComment = change.doc.data();
                if (newChannelComment.parentId) {
                    checkIfReplyToMyChannelComment(newChannelComment.parentId);
                }
            }
        });
    });
}
async function checkIfReplyToMyChannelComment(parentId) {
    if (!currentUser) return;
    try {
        const parentDoc = await getDoc(doc(db, "channelComments", parentId));
        if (parentDoc.exists()) {
            const parentData = parentDoc.data();
            if (parentData.authorId === currentUser.uid) {
                showToast("내 채널 댓글에 답글이 달렸습니다!");
            }
        }
    } catch (error) {
        console.error("채널 답글 알림 검사 오류:", error);
    }
}
function getInitial(nickname) {
    return nickname ? nickname.charAt(0).toUpperCase() : "?";
}
function sanitizeInput(input) {
    let cleanInput = input
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#x27;")
                .replace(/&/g, "&amp;");
    return cleanInput.length > 200 ? cleanInput.substring(0, 200) : cleanInput;
}
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        if (user.isAnonymous) {
                let storedName = localStorage.getItem('myAnonName');
                if (!storedName) {
                    storedName = '블찾사-' + Math.floor(1000 + Math.random() * 9000);
                    localStorage.setItem('myAnonName', storedName);
                }
                userNickname = storedName;
                userAvatarColor = '#4da6ff';
        } else {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                    userNickname = userDoc.data().nickname;
                    userAvatarColor = userDoc.data().avatarColor || "#4da6ff";
                    }
                } catch (error) {
                    console.error("사용자 정보 로딩 오류:", error);
                }
        }
        let displayName = userNickname;
        if (!displayName) {
            if (user.email) {
                    displayName = user.email.split('@')[0];
            } else {
                    displayName = 'Guest-' + user.uid.substring(0,5);
            }
        }
        document.querySelector("#loginStatus").innerText = `${displayName}님`;
        const userAvatarElement = document.getElementById("userAvatar");
        userAvatarElement.style.backgroundColor = userAvatarColor;
        userAvatarElement.style.display = "flex";
        userAvatarElement.textContent = getInitial(displayName);
        document.querySelector("#logoutBtn").style.display = "block";
        document.querySelector("#loginBtn").style.display = "none";
        document.querySelector("#registerBtn").style.display = "none";
        document.querySelector("#writePostBtn").style.display = "block";
        document.querySelector("#addChannelBtn").style.display = "block";
    } else {
        userNickname = null;
        userAvatarColor = "#4da6ff";
        document.querySelector("#loginStatus").innerText = "로그인이 필요합니다.";
        document.getElementById("userAvatar").style.display = "none";
        document.querySelector("#logoutBtn").style.display = "none";
        document.querySelector("#loginBtn").style.display = "block";
        document.querySelector("#registerBtn").style.display = "block";
        document.querySelector("#writePostBtn").style.display = "none";
        document.querySelector("#addChannelBtn").style.display = "none";
    }
    if (currentTab === "board") {
        fetchPosts();
    } else {
        fetchChannels();
    }
});
async function registerUser(email, password, nickname) {
    try {
        if (!validateEmail(email)) {
            showToast("유효한 이메일 형식이 아닙니다.");
            return;
        }
        if (!nickname || nickname.length < 2 || nickname.length > 10) {
            showToast("닉네임은 2자에서 10자 사이로 입력해주세요.");
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
                    email: email,
                    nickname: nickname,
                    avatarColor: selectedAvatarColor,
                    createdAt: Math.floor(Date.now() / 1000),
                    postCount: 0,
                    commentCount: 0,
                    likeCount: 0
                });
        showToast("회원가입 완료!");
        registerModal.style.display = "none";
    } catch (error) {
        showToast(error.message);
    }
}
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
async function loginUser(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("로그인 성공!");
        loginModal.style.display = "none";
        document.getElementById("loginEmail").value = "";
        document.getElementById("loginPassword").value = "";
    } catch (error) {
        showToast(error.message);
    }
}
async function logoutUser() {
    try {
        await signOut(auth);
        showToast("로그아웃되었습니다.");
    } catch (error) {
        showToast(error.message);
    }
}
async function updateUserProfile() {
    if (!currentUser) return;
    const newNickname = document.getElementById("editNickname").value.trim();
    const selectedColorEl = document.querySelector("#profileColorOptions .avatar-color.selected");
    const newColor = selectedColorEl ? selectedColorEl.getAttribute("data-color") : userAvatarColor;
    if (newNickname && (newNickname.length < 2 || newNickname.length > 10)) {
        showToast("닉네임은 2자에서 10자 사이여야 합니다.");
        return;
    }
    try {
        const userRef = doc(db, "users", currentUser.uid);
        const updateData = {};
        if (newNickname) {
            updateData.nickname = newNickname;
        }
        if (newColor) {
            updateData.avatarColor = newColor;
        }
        if (Object.keys(updateData).length > 0) {
            await updateDoc(userRef, updateData);
            if (newNickname) userNickname = newNickname;
            if (newColor) userAvatarColor = newColor;
            if (newNickname) {
                document.querySelector("#loginStatus").innerText = `${newNickname}님`;
                document.getElementById("profileUsername").textContent = newNickname;
            }
            if (newColor) {
                document.getElementById("userAvatar").style.backgroundColor = newColor;
                document.getElementById("profileAvatar").style.backgroundColor = newColor;
            }
            showToast("프로필이 업데이트되었습니다.");
        }
    } catch (error) {
        console.error("프로필 업데이트 오류:", error);
        showToast("프로필 업데이트 중 오류가 발생했습니다.");
    }
}
async function fetchPosts() {
    console.log("fetchPosts 호출됨");
    try {
        if (searchTerm) {
            await searchPosts(searchTerm);
            return;
        }
        const postsRef = collection(db, "posts");
        let q;
        if (lastVisiblePost && currentPage > 1) {
            q = query(
                postsRef, 
                orderBy("timestamp", "desc"), 
                startAfter(lastVisiblePost), 
                limit(postsPerPage)
            );
        } else {
            q = query(
                postsRef, 
                orderBy("timestamp", "desc"), 
                limit(postsPerPage)
            );
        }
        const querySnapshot = await getDocs(q);
        const totalSnapshot = await getDocs(query(postsRef));
        const totalPosts = totalSnapshot.size;
        totalPages = Math.ceil(totalPosts / postsPerPage);
        renderPagination(totalPages, currentPage);
        if (!querySnapshot.empty) {
            firstVisiblePost = querySnapshot.docs[0];
            lastVisiblePost = querySnapshot.docs[querySnapshot.docs.length - 1];
        }
        let postListHTML = "";
        let startNumber = totalPosts - (currentPage - 1) * postsPerPage;
        allPosts = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            allPosts.push({ id: doc.id, ...data });
            const postNumber = startNumber--;
            const formattedDate = formatDate(data.timestamp);
            const commentCount = data.commentCount || 0;
            postListHTML += `
                <tr data-id="${doc.id}" onclick="viewPost('${doc.id}')">
                    <td>${postNumber}</td>
                    <td>${data.title || ""}</td>
                    <td>${data.nickname || data.author || ""}</td>
                    <td>${formattedDate}</td>
                    <td>${data.views || 0}</td>
                    <td>${commentCount}</td>
                    <td>${(data.likes || 0) - (data.dislikes || 0)}</td>
                </tr>`;
        });
        document.getElementById("post-list-body").innerHTML = postListHTML;
    } catch (error) {
        console.error("글 목록 로딩 오류:", error);
        showToast("게시글을 불러오는 중 오류가 발생했습니다.");
    }
}
searchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        searchTerm = searchInput.value.trim();
        currentPage = 1;
        fetchPosts();
    } else if (searchInput.value.trim() === "" && searchTerm !== "") {
        searchTerm = "";
        currentPage = 1;
        fetchPosts();
    }
});
async function searchPosts(term) {
    try {
        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const searchResults = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (
                (data.title && data.title.toLowerCase().includes(term.toLowerCase())) ||
                (data.content && data.content.toLowerCase().includes(term.toLowerCase())) ||
                (data.nickname && data.nickname.toLowerCase().includes(term.toLowerCase())) ||
                (data.author && data.author.toLowerCase().includes(term.toLowerCase()))
            ) {
                searchResults.push({ id: doc.id, ...data });
            }
        });
        totalPages = Math.ceil(searchResults.length / postsPerPage);
        const startIndex = (currentPage - 1) * postsPerPage;
        const paginatedResults = searchResults.slice(startIndex, startIndex + postsPerPage);
        renderPagination(totalPages, currentPage);
        let postListHTML = "";
        if (searchResults.length === 0) {
            postListHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">검색 결과가 없습니다.</td></tr>`;
        } else {
            paginatedResults.forEach((post, index) => {
                const postNumber = searchResults.length - (startIndex + index);
                const formattedDate = formatDate(post.timestamp);
                postListHTML += `
                            <tr data-id="${post.id}" onclick="viewPost('${post.id}')">
                                <td>${postNumber}</td>
                                <td>${post.title || ""}</td>
                                <td>${post.nickname || post.author || ""}</td>
                                <td>${formattedDate}</td>
                                <td>${post.views || 0}</td>
                                <td>${(post.likes || 0) - (post.dislikes || 0)}</td>
                            </tr>`;
            });
        }
        document.getElementById("post-list-body").innerHTML = postListHTML;
    } catch (error) {
        console.error("게시글 검색 오류:", error);
        showToast("검색 중 오류가 발생했습니다.");
    }
}
function renderPagination(total, current) {
    const paginationEl = document.getElementById("pagination");
    let paginationHTML = "";
    if (total > 5 && current > 1) {
        paginationHTML += `<button onclick="goToPage(1)">처음</button>`;
        paginationHTML += `<button onclick="goToPage(${current - 1})">이전</button>`;
    }
    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(total, startPage + 4);
    if (total <= 5) {
        startPage = 1;
        endPage = total;
    } else if (current <= 3) {
        startPage = 1;
        endPage = 5;
    } else if (current >= total - 2) {
        startPage = total - 4;
        endPage = total;
    }
    for (let i = startPage; i <= endPage; i++) {
        if (i === current) {
            paginationHTML += `<button class="active">${i}</button>`;
        } else {
            paginationHTML += `<button onclick="goToPage(${i})">${i}</button>`;
        }
    }
    if (total > 5 && current < total) {
        paginationHTML += `<button onclick="goToPage(${current + 1})">다음</button>`;
        paginationHTML += `<button onclick="goToPage(${total})">마지막</button>`;
    }
    paginationEl.innerHTML = paginationHTML;
}
function goToPage(page) {
    currentPage = page;
    if (searchTerm) {
        searchPosts(searchTerm);
    } else {
        fetchPosts();
    }
    window.scrollTo(0, 0);
}
async function fetchChannels() {
    try {
        const channelsRef = collection(db, "channels");
        const q = query(channelsRef, orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        let channelsHTML = "";
        if (querySnapshot.empty) {
            channelsHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 20px;">아직 등록된 채널이 없습니다.</p>`;
        } else {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const formattedDate = formatDate(data.timestamp);
                const statusClass = data.status === "green" ? "green" : "red";
                const statusText = data.status === "green" ? "등장 중" : "없음";
                channelsHTML += `
                            <div class="channel-box ${statusClass}" data-id="${doc.id}" onclick="viewChannel('${doc.id}')">
                                <div class="channel-name">${data.name}</div>
                                <div class="channel-info">상태: ${statusText}</div>
                                <div class="channel-info">등록: ${formattedDate}</div>
                            </div>
                        `;
            });
        }
        document.getElementById("channelsContainer").innerHTML = channelsHTML;
    } catch (error) {
        console.error("채널 목록 로딩 오류:", error);
        showToast("채널 목록을 불러오는 중 오류가 발생했습니다.");
    }
}
async function writePost() {
    const title = document.getElementById("postTitle").value.trim();
    const content = document.getElementById("postContent").value.trim();
    if (!title || !content) {
        showToast("제목과 내용을 모두 입력해주세요.");
        return;
    }
    let authorName = "";
    if (currentUser) {
        if (currentUser.isAnonymous) {
            authorName = localStorage.getItem('myAnonName') || "Guest";
        } else {
            authorName = userNickname || (currentUser.email ? currentUser.email.split('@')[0] : "Guest");
        }
    } else {
        authorName = "Guest";
    }
    try {
        await addDoc(collection(db, "posts"), {
                title: title,
                content: content,
                author: currentUser.email ? currentUser.email.split('@')[0] : (localStorage.getItem('myAnonName') || "Guest"),
                authorId: currentUser ? currentUser.uid : null,
                timestamp: Math.floor(Date.now() / 1000),
                views: 0,
                likes: 0,
                dislikes: 0,
                voters: {}
        });
        showToast("글이 등록되었습니다.");
        writeModal.style.display = "none";
        document.getElementById("postTitle").value = "";
        document.getElementById("postContent").value = "";
        fetchPosts();
    } catch (error) {
        console.error("글 작성 오류:", error);
        showToast("글 작성 중 오류가 발생했습니다.");
    }
}
async function addChannel() {
    const name = document.getElementById("channelName").value.trim();
    const status = document.getElementById("channelStatus").value;
    const description = document.getElementById("channelDesc").value.trim();
    if (!name) {
        showToast("채널 이름을 입력해주세요.");
        return;
    }
    const channelPattern = /^[a-zA-Z]-[\uAC00-\uD7A3a-zA-Z0-9]+$/;
    if (!channelPattern.test(name)) {
        showToast("채널 이름은 '문자-문자숫자' 형식이어야 합니다. 예: a-빅101");
        return;
    }
    try {
        const channelsRef = collection(db, "channels");
        const q = query(channelsRef, where("name", "==", name));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            showToast("이미 존재하는 채널 이름입니다.");
            return;
        }
        const now = Math.floor(Date.now() / 1000);
        let authorName = "";
        let nickname = userNickname;
        let avatarColor = userAvatarColor;
        if (currentUser) {
            if (currentUser.isAnonymous) {
                authorName = localStorage.getItem('myAnonName') || "Guest";
                nickname = authorName;
            } else {
                authorName = userNickname || (currentUser.email ? currentUser.email.split('@')[0] : "Guest");
                nickname = authorName;
                try {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        nickname = userDoc.data().nickname;
                        avatarColor = userDoc.data().avatarColor || "#4da6ff";
                    }
                } catch (error) {
                    console.error("사용자 정보 로딩 오류:", error);
                }
            }
        } else {
            authorName = "Guest";
            nickname = authorName;
        }
        await addDoc(collection(db, "channels"), {
            name: name,
            status: status,
            description: description,
            author: currentUser.email ? currentUser.email.split('@')[0] : (localStorage.getItem('myAnonName') || "Guest"),
            nickname: nickname || (currentUser.email ? currentUser.email.split('@')[0] : (localStorage.getItem('myAnonName') || "Guest")),
            authorId: currentUser.uid,
            avatarColor: avatarColor,
            timestamp: now,
            likes: 0,
            dislikes: 0,
            voters: {}
        });
        showToast("채널이 추가되었습니다.");
        channelModal.style.display = "none";
        document.getElementById("channelName").value = "";
        document.getElementById("channelDesc").value = "";
        document.getElementById("channelStatus").value = "green";
        fetchChannels();
    } catch (error) {
        console.error("채널 추가 오류:", error);
        showToast("채널 추가 중 오류가 발생했습니다.");
    }
}
async function viewPost(postId) {
    console.log("viewPost 함수 실행됨, ID:", postId);
    try {
        currentPostId = postId;
        const docRef = doc(db, "posts", postId);
        const postDoc = await getDoc(docRef);
        console.log("Firestore 문서 가져옴:", postDoc.exists() ? "문서 있음" : "문서 없음");
        if (postDoc.exists()) {
            const data = postDoc.data();
            if (currentUser && currentUser.uid !== data.authorId) {
                await updateDoc(doc(db, "posts", postId), {
                    views: increment(1)
                });
            }
            const avatarColor = data.avatarColor || "#4da6ff";
            const authorInitial = getInitial(data.nickname || data.author);
            const formattedDate = formatDate(data.timestamp);
            document.getElementById("viewTitle").textContent = data.title;
            document.getElementById("viewAuthor").textContent = data.nickname || data.author;
            document.getElementById("postAuthorAvatar").textContent = authorInitial;
            document.getElementById("postAuthorAvatar").style.backgroundColor = avatarColor;
            document.getElementById("viewDate").textContent = formattedDate;
            document.getElementById("viewViews").textContent = (data.views || 0) + 1;
            document.getElementById("likeCount").textContent = data.likes || 0;
            document.getElementById("dislikeCount").textContent = data.dislikes || 0;
            document.getElementById("viewContent").textContent = data.content || "";
            document.getElementById("editTitle").value = data.title;
            document.getElementById("editContent").value = data.content || "";
            const postActions = document.getElementById("postActions");
            if (currentUser && currentUser.uid === data.authorId) {
                postActions.style.display = "block";
            } else {
                postActions.style.display = "none";
            }
            updateVoteButtonsState("post", data);
            await loadComments(postId);
            viewModal.style.display = "block";
        } else {
            showToast("해당 게시글을 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error("게시글 조회 오류:", error);
        console.error("오류 코드:", error.code);
        console.error("오류 스택:", error.stack);
        showToast("게시글을 불러오는 중 오류가 발생했습니다.");
    }
}
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-theme');
        updateThemeIcon('light');
    }
    themeToggle.addEventListener('click', function() {
        if (body.classList.contains('light-theme')) {
            body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
            updateThemeIcon('dark');
        } else {
            body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
            updateThemeIcon('light');
        }
    });
    function updateThemeIcon(theme) {
        const iconPath = themeToggle.querySelector('svg path');
        if (theme === 'light') {
            iconPath.setAttribute('d', 'M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z');
        } else {
            iconPath.setAttribute('d', 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z');
        }
    }
});
async function viewChannel(channelId) {
    try {
        currentChannelId = channelId;
        const channelDoc = await getDoc(doc(db, "channels", channelId));
        if (channelDoc.exists()) {
            const data = channelDoc.data();
            const avatarColor = data.avatarColor || "#4da6ff";
            const authorInitial = getInitial(data.nickname || data.author);
            const formattedDate = formatDate(data.timestamp);
            const statusText = data.status === "green" ? "등장 중" : "없음";
            document.getElementById("viewChannelTitle").textContent = data.name;
            document.getElementById("viewChannelAuthor").textContent = data.nickname || data.author;
            document.getElementById("channelAuthorAvatar").textContent = authorInitial;
            document.getElementById("channelAuthorAvatar").style.backgroundColor = avatarColor;
            document.getElementById("viewChannelDate").textContent = formattedDate;
            document.getElementById("viewChannelStatus").textContent = statusText;
            document.getElementById("viewChannelStatus").style.color = data.status === "green" ? "#4caf50" : "#f44336";
            document.getElementById("channelLikeCount").textContent = data.likes || 0;
            document.getElementById("channelDislikeCount").textContent = data.dislikes || 0;
            document.getElementById("viewChannelContent").textContent = data.description || "";
            document.getElementById("editChannelName").value = data.name;
            document.getElementById("editChannelStatus").value = data.status;
            document.getElementById("editChannelDesc").value = data.description || "";
            const channelActions = document.getElementById("channelActions");
            if (currentUser && currentUser.uid === data.authorId) {
                channelActions.style.display = "block";
            } else {
                channelActions.style.display = "none";
            }
            updateVoteButtonsState("channel", data);
            await loadChannelComments(channelId);
            viewChannelModal.style.display = "block";
        } else {
            showToast("해당 채널을 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error("채널 조회 오류:", error);
        showToast("채널을 불러오는 중 오류가 발생했습니다.");
    }
}
async function updatePost() {
    const title = document.getElementById("editTitle").value.trim();
    const content = document.getElementById("editContent").value.trim();
    if (!title || !content) {
        showToast("제목과 내용을 모두 입력해주세요.");
        return;
    }
    try {
        await updateDoc(doc(db, "posts", currentPostId), {
            title: title,
            content: content,
            lastEdited: Math.floor(Date.now() / 1000)
        });
        showToast("글이 수정되었습니다.");
        document.getElementById("editForm").style.display = "none";
        document.getElementById("viewContent").style.display = "block";
        document.getElementById("viewTitle").textContent = title;
        document.getElementById("viewContent").textContent = content;
        fetchPosts();
    } catch (error) {
        console.error("글 수정 오류:", error);
        showToast("글 수정 중 오류가 발생했습니다.");
    }
}
async function updateChannel() {
    const name = document.getElementById("editChannelName").value.trim();
    const status = document.getElementById("editChannelStatus").value;
    const description = document.getElementById("editChannelDesc").value.trim();
    if (!name) {
        showToast("채널 이름을 입력해주세요.");
        return;
    }
    const channelPattern = /^[a-zA-Z]-[\uAC00-\uD7A3a-zA-Z0-9]+[0-9]+$/;
    if (!channelPattern.test(name)) {
        showToast("채널 이름은 '문자-문자숫자' 형식이어야 합니다. 예: a-빅101");
        return;
    }
    try {
        const channelDoc = await getDoc(doc(db, "channels", currentChannelId));
        const originalData = channelDoc.data();
        if (name !== originalData.name) {
            const channelsRef = collection(db, "channels");
            const q = query(channelsRef, where("name", "==", name));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                showToast("이미 존재하는 채널 이름입니다.");
                return;
            }
        }
        await updateDoc(doc(db, "channels", currentChannelId), {
            name: name,
            status: status,
            description: description,
            lastEdited: Math.floor(Date.now() / 1000)
        });
        showToast("채널이 수정되었습니다.");
        document.getElementById("editChannelForm").style.display = "none";
        document.getElementById("viewChannelContent").style.display = "block";
        document.getElementById("viewChannelTitle").textContent = name;
        document.getElementById("viewChannelStatus").textContent = status === "green" ? "등장 중" : "없음";
        document.getElementById("viewChannelStatus").style.color = status === "green" ? "#4caf50" : "#f44336";
        document.getElementById("viewChannelContent").textContent = description;
        fetchChannels();
    } catch (error) {
        console.error("채널 수정 오류:", error);
        showToast("채널 수정 중 오류가 발생했습니다.");
    }
}
async function deletePost() {
    if (!confirm("정말 이 글을 삭제하시겠습니까?")) {
        return;
    }
    try {
        await deleteDoc(doc(db, "posts", currentPostId));
        const commentsRef = collection(db, "comments");
        const q = query(commentsRef, where("postId", "==", currentPostId));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (commentDoc) => {
            await deleteDoc(doc(db, "comments", commentDoc.id));
        });
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            postCount: increment(-1)
        });
        showToast("글이 삭제되었습니다.");
        viewModal.style.display = "none";
        fetchPosts();
    } catch (error) {
        console.error("글 삭제 오류:", error);
        showToast("글 삭제 중 오류가 발생했습니다.");
    }
}
async function deleteChannel() {
    if (!confirm("정말 이 채널을 삭제하시겠습니까?")) {
        return;
    }
    try {
        await deleteDoc(doc(db, "channels", currentChannelId));
        const commentsRef = collection(db, "channelComments");
        const q = query(commentsRef, where("channelId", "==", currentChannelId));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (commentDoc) => {
            await deleteDoc(doc(db, "channelComments", commentDoc.id));
        });
        showToast("채널이 삭제되었습니다.");
        viewChannelModal.style.display = "none";
        fetchChannels();
    } catch (error) {
        console.error("채널 삭제 오류:", error);
        showToast("채널 삭제 중 오류가 발생했습니다.");
    }
}
async function votePost(type, voteType) {
    if (!currentUser) {
        showToast("로그인이 필요합니다.");
        return;
    }
    try {
        const docRef = doc(db, type === "post" ? "posts" : "channels", type === "post" ? currentPostId : currentChannelId);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
            showToast("해당 항목을 찾을 수 없습니다.");
            return;
        }
        const data = docSnapshot.data();
        const voters = data.voters || {};
        const userId = currentUser.uid;
        const currentDate = new Date().toISOString().split('T')[0];
        if (voters[userId] && voters[userId].date === currentDate) {
            showToast("이미 오늘 추천/비추천을 하셨습니다.");
            return;
        }
        const updateFields = {};
        if (voters[userId]) {
            if (voters[userId].type === "like") {
                updateFields.likes = increment(-1);
            } else {
                updateFields.dislikes = increment(-1);
            }
        }
        if (voteType === "like") {
            updateFields.likes = increment(1);
        } else {
            updateFields.dislikes = increment(1);
        }
        voters[userId] = {
            type: voteType,
            date: currentDate
        };
        updateFields.voters = voters;
        await updateDoc(docRef, updateFields);
        if (voteType === "like" && (!voters[userId] || voters[userId].type !== "like")) {
            try {
                const authorRef = doc(db, "users", data.authorId);
                await updateDoc(authorRef, {
                    likeCount: increment(1)
                });
            } catch (error) {
                console.error("작성자 추천수 업데이트 오류:", error);
            }
        }
        if (type === "post") {
            document.getElementById("likeCount").textContent = (data.likes || 0) + (voteType === "like" ? 1 : 0) - (voters[userId] && voters[userId].type === "like" ? 1 : 0);
            document.getElementById("dislikeCount").textContent = (data.dislikes || 0) + (voteType === "dislike" ? 1 : 0) - (voters[userId] && voters[userId].type === "dislike" ? 1 : 0);
            document.getElementById("likeBtn").style.backgroundColor = voteType === "like" ? "#3d8b3d" : "#4da6ff";
            document.getElementById("dislikeBtn").style.backgroundColor = voteType === "dislike" ? "#c9302c" : "#ff4d4d";
        } else {
            document.getElementById("channelLikeCount").textContent = (data.likes || 0) + (voteType === "like" ? 1 : 0) - (voters[userId] && voters[userId].type === "like" ? 1 : 0);
            document.getElementById("channelDislikeCount").textContent = (data.dislikes || 0) + (voteType === "dislike" ? 1 : 0) - (voters[userId] && voters[userId].type === "dislike" ? 1 : 0);
            document.getElementById("channelLikeBtn").style.backgroundColor = voteType === "like" ? "#3d8b3d" : "#4da6ff";
            document.getElementById("channelDislikeBtn").style.backgroundColor = voteType === "dislike" ? "#c9302c" : "#ff4d4d";
        }
        showToast(voteType === "like" ? "추천되었습니다." : "비추천되었습니다.");
    } catch (error) {
        console.error("투표 오류:", error);
        showToast("투표 중 오류가 발생했습니다.");
    }
}

import { getDatabase, ref, push, onChildAdded, set, onDisconnect, remove, onValue } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

const database = getDatabase(app);

window.addEventListener('error', function(e) {
    console.error("전역 에러:", e.error);
    showToast("오류가 발생했습니다. 콘솔을 확인하세요.");
});

function updateVoteButtonsState(type, data) {
    if (!currentUser) return;
    const voters = data.voters || {};
    const userId = currentUser.uid;
    const currentDate = new Date().toISOString().split('T')[0];
    if (voters[userId] && voters[userId].date === currentDate) {
        if (type === "post") {
            document.getElementById("likeBtn").style.backgroundColor = voters[userId].type === "like" ? "#3d8b3d" : "#4da6ff";
            document.getElementById("dislikeBtn").style.backgroundColor = voters[userId].type === "dislike" ? "#c9302c" : "#ff4d4d";
        } else {
            document.getElementById("channelLikeBtn").style.backgroundColor = voters[userId].type === "like" ? "#3d8b3d" : "#4da6ff";
            document.getElementById("channelDislikeBtn").style.backgroundColor = voters[userId].type === "dislike" ? "#c9302c" : "#ff4d4d";
        }
    } else {
        if (type === "post") {
            document.getElementById("likeBtn").style.backgroundColor = "#4da6ff";
            document.getElementById("dislikeBtn").style.backgroundColor = "#ff4d4d";
        } else {
            document.getElementById("channelLikeBtn").style.backgroundColor = "#4da6ff";
            document.getElementById("channelDislikeBtn").style.backgroundColor = "#ff4d4d";
        }
    }
}

async function loadComments(postId) {
    try {
        if (!postId) {
            document.getElementById("comments").innerHTML = "<p>댓글을 불러올 수 없습니다: 유효하지 않은 게시글 ID</p>";
            return;
        }
        const commentsRef = collection(db, "comments");
        const q = query(commentsRef, where("postId", "==", postId), orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        const commentsArray = [];
        querySnapshot.forEach((doc) => {
            commentsArray.push({ id: doc.id, ...doc.data() });
        });
        const commentsHTML = commentsArray.length === 0 ? "<p>아직 댓글이 없습니다.</p>" : renderCommentsTree(commentsArray);
        document.getElementById("comments").innerHTML = commentsHTML;
    } catch (error) {
        document.getElementById("comments").innerHTML = `
                    <p style="color: #ff6b6b;">댓글 로딩 중 오류가 발생했습니다:</p>
                    <p style="color: #ff6b6b; font-size: 0.9em;">${error.message}</p>
                `;
    }
}

async function loadChannelComments(channelId) {
    try {
        if (!channelId) {
            document.getElementById("channelComments").innerHTML = "<p>채널 댓글을 불러올 수 없습니다: 유효하지 않은 채널 ID</p>";
            return;
        }
        const commentsRef = collection(db, "channelComments");
        const q = query(commentsRef, where("channelId", "==", channelId), orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        const commentsArray = [];
        querySnapshot.forEach((doc) => {
            commentsArray.push({ id: doc.id, ...doc.data() });
        });
        const commentsHTML = commentsArray.length === 0 ? "<p>아직 댓글이 없습니다.</p>" : renderCommentsTree(commentsArray);
        document.getElementById("channelComments").innerHTML = commentsHTML;
    } catch (error) {
        document.getElementById("channelComments").innerHTML = `
                    <p style="color: #ff6b6b;">채널 댓글 로딩 중 오류가 발생했습니다:</p>
                    <p style="color: #ff6b6b; font-size: 0.9em;">${error.message}</p>
                `;
    }
}

async function submitComment() {
    if (!currentUser) {
        showToast("댓글을 작성하려면 로그인이 필요합니다.");
        return;
    }
    const now = Date.now();
    if (now - lastCommentTime < 5000) {
        showToast("댓글은 5초에 한 번만 입력할 수 있습니다.");
        return;
    }
    lastCommentTime = now;
    const commentText = document.getElementById("commentText").value.trim();
    if (!commentText) {
        showToast("댓글 내용을 입력해주세요.");
        return;
    }
    try {
        let nickname = userNickname;
        let avatarColor = userAvatarColor;
        if (!nickname) {
            try {
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) {
                    nickname = userDoc.data().nickname;
                    avatarColor = userDoc.data().avatarColor || "#4da6ff";
                }
            } catch (error) {
                console.error("사용자 정보 로딩 오류:", error);
            }
        }
        await addDoc(collection(db, "comments"), {
            postId: currentPostId,
            content: commentText,
            author: currentUser.email ? currentUser.email.split('@')[0] : (localStorage.getItem('myAnonName') || "Guest"),
            nickname: nickname || (currentUser.email ? currentUser.email.split('@')[0] : (localStorage.getItem('myAnonName') || "Guest")),
            authorId: currentUser.uid,
            avatarColor: avatarColor,
            timestamp: Math.floor(Date.now() / 1000),
            parentId: replyToCommentId || null
        });
        console.log("현재 포스트 ID:", currentPostId);
        if (currentPostId) {
            const postRef = doc(db, "posts", currentPostId);
            const postDoc = await getDoc(postRef);
            if (postDoc.exists()) {
                console.log("게시글 찾음, 댓글 수 업데이트 중");
                await updateDoc(postRef, {
                    commentCount: increment(1)
                });
            } else {
                console.error("게시글을 찾을 수 없음:", currentPostId);
            }
        } else {
            console.error("현재 포스트 ID가 없음");
        }
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            commentCount: increment(1)
        });
        document.getElementById("commentText").value = "";
        await loadComments(currentPostId);
        if (currentTab === "board") {
            fetchPosts();
        }
        showToast("댓글이 등록되었습니다.");
    } catch (error) {
        console.error("댓글 작성 오류:", error);
        showToast("댓글 작성 중 오류가 발생했습니다.");
    }
    scrollToBottom();
}

async function submitChannelComment() {
    if (!currentUser) {
        showToast("댓글을 작성하려면 로그인이 필요합니다.");
        return;
    }
    const commentText = document.getElementById("channelCommentText").value.trim();
    if (!commentText) {
        showToast("댓글 내용을 입력해주세요.");
        return;
    }
    try {
        let authorName = "";
        let nickname = userNickname;
        let avatarColor = userAvatarColor;
        if (currentUser) {
            if (currentUser.isAnonymous) {
                authorName = localStorage.getItem('myAnonName') || "Guest";
                nickname = authorName;
            } else {
                try {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        nickname = userDoc.data().nickname;
                        avatarColor = userDoc.data().avatarColor || "#4da6ff";
                    }
                } catch (error) {
                    console.error("사용자 정보 로딩 오류:", error);
                }
                authorName = userNickname || (currentUser.email ? currentUser.email.split('@')[0] : "Guest");
                nickname = nickname || authorName;
            }
        } else {
            authorName = "Guest";
            nickname = authorName;
        }
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            await setDoc(userRef, {
                commentCount: 1,
                nickname: nickname,
                avatarColor: avatarColor || "#4da6ff"
            });
        } else {
            await updateDoc(userRef, {
                commentCount: increment(1)
            });
        }
        await addDoc(collection(db, "channelComments"), {
            channelId: currentChannelId,
            content: commentText,
            author: currentUser.email ? currentUser.email.split('@')[0] : (localStorage.getItem('myAnonName') || "Guest"),
            nickname: nickname || (currentUser.email ? currentUser.email.split('@')[0] : (localStorage.getItem('myAnonName') || "Guest")),
            authorId: currentUser.uid,
            avatarColor: avatarColor,
            timestamp: Math.floor(Date.now() / 1000),
            parentId: replyToCommentId || null
        });
        document.getElementById("channelCommentText").value = "";
        await loadChannelComments(currentChannelId);
    } catch (error) {
        console.error("채널 댓글 작성 오류:", error);
        showToast("댓글 작성 중 오류가 발생했습니다.");
    }
    scrollToBottom();
}

async function deleteComment(commentId) {
    if (!confirm("정말 이 댓글을 삭제하시겠습니까?")) {
        return;
    }
    try {
        const commentDoc = await getDoc(doc(db, "comments", commentId));
        if (commentDoc.exists()) {
            const commentData = commentDoc.data();
            const postId = commentData.postId;
            const postRef = doc(db, "posts", postId);
            await updateDoc(postRef, {
                commentCount: increment(-1)
            });
            await deleteDoc(doc(db, "comments", commentId));
            if (currentUser) {
                const userRef = doc(db, "users", currentUser.uid);
                await updateDoc(userRef, {
                    commentCount: increment(-1)
                });
            }
            showToast("댓글이 삭제되었습니다.");
            if (currentTab === "board") {
                fetchPosts();
            }
            await loadComments(currentPostId);
        }
    } catch (error) {
        console.error("댓글 삭제 오류:", error);
        console.error("오류 상세:", error.message);
        showToast("댓글 삭제 중 오류가 발생했습니다.");
    }
}

async function deleteChannelComment(commentId) {
    if (!confirm("정말 이 댓글을 삭제하시겠습니까?")) {
        return;
    }
    try {
        await deleteDoc(doc(db, "channelComments", commentId));
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            commentCount: increment(-1)
        });
        showToast("댓글이 삭제되었습니다.");
        await loadChannelComments(currentChannelId);
    } catch (error) {
        console.error("채널 댓글 삭제 오류:", error);
        showToast("댓글 삭제 중 오류가 발생했습니다.");
    }
}

async function loadProfile() {
    if (!currentUser) return;
    try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            document.getElementById("profileUsername").textContent = userData.nickname || currentUser.email.split('@')[0];
            document.getElementById("profileEmail").textContent = userData.email || currentUser.email;
            document.getElementById("profilePostCount").textContent = userData.postCount || 0;
            document.getElementById("profileCommentCount").textContent = userData.commentCount || 0;
            document.getElementById("profileLikeCount").textContent = userData.likeCount || 0;
            const avatarColor = userData.avatarColor || "#4da6ff";
            const initial = getInitial(userData.nickname || currentUser.email.split('@')[0]);
            document.getElementById("profileAvatar").style.backgroundColor = avatarColor;
            document.getElementById("profileAvatar").textContent = initial;
            document.getElementById("editNickname").value = userData.nickname || "";
            const colorOptions = document.querySelectorAll("#profileColorOptions .avatar-color");
            colorOptions.forEach(option => {
                if (option.getAttribute("data-color") === avatarColor) {
                    option.classList.add("selected");
                } else {
                    option.classList.remove("selected");
                }
            });
            await loadUserPosts();
        }
    } catch (error) {
        console.error("프로필 로딩 오류:", error);
    }
}

async function loadUserPosts() {
    if (!currentUser) return;
    try {
        const postsRef = collection(db, "posts");
        const q = query(postsRef, where("authorId", "==", currentUser.uid), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        let postsHTML = "";
        if (querySnapshot.empty) {
            postsHTML = "<p>작성한 글이 없습니다.</p>";
        } else {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const formattedDate = formatDate(data.timestamp);
                postsHTML += `
                            <div style="background: #333; padding: 10px; margin-bottom: 10px; border-radius: 5px; cursor: pointer;" onclick="viewPost('${doc.id}')">
                                <div style="font-weight: bold; margin-bottom: 5px;">${data.title}</div>
                                <div style="color: #aaa; font-size: 0.9em;">
                                    <span>${formattedDate}</span> | 
                                    <span>조회: ${data.views || 0}</span> | 
                                    <span>추천: ${(data.likes || 0) - (data.dislikes || 0)}</span>
                                </div>
                            </div>
                        `;
            });
        }
        document.getElementById("userPosts").innerHTML = postsHTML;
    } catch (error) {
        console.error("사용자 글 로딩 오류:", error);
        document.getElementById("userPosts").innerHTML = "<p>작성한 글을 불러오는 중 오류가 발생했습니다.</p>";
    }
}

async function loadUserComments() {
    if (!currentUser) return;
    try {
        const commentsRef = collection(db, "comments");
        const q1 = query(commentsRef, where("authorId", "==", currentUser.uid), orderBy("timestamp", "desc"));
        const querySnapshot1 = await getDocs(q1);
        const channelCommentsRef = collection(db, "channelComments");
        const q2 = query(channelCommentsRef, where("authorId", "==", currentUser.uid), orderBy("timestamp", "desc"));
        const querySnapshot2 = await getDocs(q2);
        let commentsHTML = "";
        if (querySnapshot1.empty && querySnapshot2.empty) {
            commentsHTML = "<p>작성한 댓글이 없습니다.</p>";
        } else {
            for (const commentDoc of querySnapshot1.docs) {
                const data = commentDoc.data();
                const formattedDate = formatDate(data.timestamp);
                try {
                    const postDoc = await getDoc(doc(db, "posts", data.postId));
                    console.log("Firestore 문서 가져옴:", postDoc.exists() ? "문서 있음" : "문서 없음");
                    if (postDoc.exists()) {
                        const postData = postDoc.data();
                        commentsHTML += `
                                    <div style="background: #333; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                                        <div style="font-size: 0.9em; color: #aaa; margin-bottom: 5px;">
                                            게시글: <span style="font-weight: bold; cursor: pointer;" onclick="viewPost('${data.postId}')">${postData.title}</span>
                                        </div>
                                        <div style="margin-bottom: 5px;">${data.content}</div>
                                        <div style="color: #aaa; font-size: 0.8em;">${formattedDate}</div>
                                    </div>
                                `;
                    }
                } catch (error) {
                    console.error("게시글 정보 로딩 오류:", error);
                }
            }
            for (const commentDoc of querySnapshot2.docs) {
                const data = commentDoc.data();
                const formattedDate = formatDate(data.timestamp);
                try {
                    const channelDoc = await getDoc(doc(db, "channels", data.channelId));
                    if (channelDoc.exists()) {
                        const channelData = channelDoc.data();
                        commentsHTML += `
                                    <div style="background: #333; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                                        <div style="font-size: 0.9em; color: #aaa; margin-bottom: 5px;">
                                            채널: <span style="font-weight: bold; cursor: pointer;" onclick="viewChannel('${data.channelId}')">${channelData.name}</span>
                                        </div>
                                        <div style="margin-bottom: 5px;">${data.content}</div>
                                        <div style="color: #aaa; font-size: 0.8em;">${formattedDate}</div>
                                    </div>
                                `;
                    }
                } catch (error) {
                    console.error("채널 정보 로딩 오류:", error);
                }
            }
        }
        document.getElementById("userComments").innerHTML = commentsHTML;
    } catch (error) {
        console.error("사용자 댓글 로딩 오류:", error);
        document.getElementById("userComments").innerHTML = "<p>작성한 댓글을 불러오는 중 오류가 발생했습니다.</p>";
    }
}

async function signUp(email, password) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        nickname: user.email.split('@')[0],
        avatarColor: "#4da6ff",
        commentCount: 0,
        postCount: 0,
        createdAt: Math.floor(Date.now() / 1000)
    });
}

function listenForPostUpdates() {
    const postsRef = collection(db, "posts");
    const postsQuery = query(postsRef, orderBy("timestamp", "desc"));
    onSnapshot(postsQuery, (snapshot) => {
        console.log("onSnapshot 호출됨. 변경된 문서 개수:", snapshot.docChanges().length);
        snapshot.docChanges().forEach(change => {
            console.log("변경 유형:", change.type, "문서 ID:", change.doc.id);
        });
        fetchPosts();
    });
}

function listenForChannelUpdates() {
    const channelsRef = collection(db, "channels");
    const channelsQuery = query(channelsRef, orderBy("timestamp", "desc"));
    onSnapshot(channelsQuery, (snapshot) => {
        fetchChannels();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    fetchPosts();
    fetchChannels();
    listenForPostUpdates();
    listenForChannelUpdates();
    listenForCommentUpdates();
    listenForChannelCommentUpdates();
    initChat();
});

document.querySelector("#registerBtn").addEventListener("click", () => {
    registerModal.style.display = "block";
});
        
document.querySelector("#loginBtn").addEventListener("click", () => {
    loginModal.style.display = "block";
});
        
document.querySelector("#logoutBtn").addEventListener("click", logoutUser1);
        
boardTabBtn.addEventListener("click", () => {
    currentTab = "board";
    boardTabBtn.classList.add("active");
    channelTabBtn.classList.remove("active");
    boardTab.style.display = "block";
    channelTab.style.display = "none";
    fetchPosts();
});
        
channelTabBtn.addEventListener("click", () => {
    currentTab = "channel";
    channelTabBtn.classList.add("active");
    boardTabBtn.classList.remove("active");
    channelTab.style.display = "block";
    boardTab.style.display = "none";
    fetchChannels();
});
        
writePostBtn.addEventListener("click", () => {
    writeModal.style.display = "block";
});
        
addChannelBtn.addEventListener("click", () => {
    channelModal.style.display = "block";
});
        
searchBtn.addEventListener("click", () => {
    searchTerm = searchInput.value.trim();
    currentPage = 1;
    fetchPosts();
});
        
searchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        searchTerm = searchInput.value.trim();
        currentPage = 1;
        fetchPosts();
    }
});
        
document.getElementById("likeBtn").addEventListener("click", () => {
    votePost("post", "like");
});
        
document.getElementById("dislikeBtn").addEventListener("click", () => {
    votePost("post", "dislike");
});
        
document.getElementById("channelLikeBtn").addEventListener("click", () => {
    votePost("channel", "like");
});
        
document.getElementById("channelDislikeBtn").addEventListener("click", () => {
    votePost("channel", "dislike");
});
        
document.getElementById("postsTab").addEventListener("click", () => {
    document.getElementById("postsTab").classList.add("active");
    document.getElementById("commentsTab").classList.remove("active");
    document.getElementById("settingsTab").classList.remove("active");
    document.getElementById("postsContent").style.display = "block";
    document.getElementById("commentsContent").style.display = "none";
    document.getElementById("settingsContent").style.display = "none";
    loadUserPosts();
});
        
document.getElementById("commentsTab").addEventListener("click", () => {
    document.getElementById("commentsTab").classList.add("active");
    document.getElementById("postsTab").classList.remove("active");
    document.getElementById("settingsTab").classList.remove("active");
    document.getElementById("commentsContent").style.display = "block";
    document.getElementById("postsContent").style.display = "none";
    document.getElementById("settingsContent").style.display = "none";
    loadUserComments();
});
        
document.getElementById("settingsTab").addEventListener("click", () => {
    document.getElementById("settingsTab").classList.add("active");
    document.getElementById("postsTab").classList.remove("active");
    document.getElementById("commentsTab").classList.remove("active");
    document.getElementById("settingsContent").style.display = "block";
    document.getElementById("postsContent").style.display = "none";
    document.getElementById("commentsContent").style.display = "none";
});
        
document.getElementById("saveProfileBtn").addEventListener("click", updateUserProfile);
        
const registerColorOptions = document.querySelectorAll(".avatar-colors .avatar-color");
registerColorOptions.forEach(option => {
    option.addEventListener("click", function() {
        registerColorOptions.forEach(opt => opt.classList.remove("selected"));
        this.classList.add("selected");
        selectedAvatarColor = this.getAttribute("data-color");
    });
});
        
const profileColorOptions = document.querySelectorAll("#profileColorOptions .avatar-color");
profileColorOptions.forEach(option => {
    option.addEventListener("click", function() {
        profileColorOptions.forEach(opt => opt.classList.remove("selected"));
        this.classList.add("selected");
    });
});
        
const closeModalButtons = document.querySelectorAll(".close-modal");
closeModalButtons.forEach(button => {
    button.addEventListener("click", function() {
        const modal = this.closest(".modal");
        modal.style.display = "none";
    });
});
        
document.getElementById("submitPost").addEventListener("click", writePost);
        
document.getElementById("submitChannel").addEventListener("click", addChannel);
        
document.getElementById("submitLogin").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    if (!email || !password) {
        showToast("이메일과 비밀번호를 모두 입력해주세요.");
        return;
    }
    await loginUser(email, password);
});
        
document.getElementById("submitRegister").addEventListener("click", async () => {
    const email = document.getElementById("registerEmail").value.trim();
    const nickname = document.getElementById("registerNickname").value.trim();
    const password = document.getElementById("registerPassword").value;
    if (!email || !nickname || !password) {
        showToast("이메일, 닉네임, 비밀번호를 모두 입력해주세요.");
        return;
    }
    if (password.length < 6) {
        showToast("비밀번호는 최소 6자 이상이어야 합니다.");
        return;
    }
    await registerUser(email, password, nickname);
    document.getElementById("registerEmail").value = "";
    document.getElementById("registerNickname").value = "";
    document.getElementById("registerPassword").value = "";
});
        
document.getElementById("editBtn").addEventListener("click", () => {
    document.getElementById("viewContent").style.display = "none";
    document.getElementById("editForm").style.display = "block";
});
        
document.getElementById("editChannelBtn").addEventListener("click", () => {
    document.getElementById("viewChannelContent").style.display = "none";
    document.getElementById("editChannelForm").style.display = "block";
});
        
document.getElementById("updatePost").addEventListener("click", updatePost);
        
document.getElementById("updateChannel").addEventListener("click", updateChannel);
        
document.getElementById("deleteBtn").addEventListener("click", deletePost);
        
document.getElementById("deleteChannelBtn").addEventListener("click", deleteChannel);
        
document.getElementById("submitComment").addEventListener("click", submitComment);
        
document.getElementById("submitChannelComment").addEventListener("click", submitChannelComment);
        
function openProfileModal() {
    if (!currentUser) {
        showToast("로그인이 필요합니다.");
        return;
    }
    profileModal.style.display = "block";
    loadProfile();
}
        
window.addEventListener("click", (event) => {
    const modals = document.querySelectorAll(".modal");
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
});
        
window.startReply = function(commentId) {
    replyToCommentId = commentId;
    showToast("답글 모드 활성화: 선택된 댓글에 답글을 작성합니다.");
};

window.viewPost = viewPost;
window.viewChannel = viewChannel;
window.goToPage = goToPage;
window.deleteComment = deleteComment;
window.deleteChannelComment = deleteChannelComment;
window.openProfileModal = openProfileModal;
