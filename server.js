const express = require('express')
const app = express()

//post요청시 데이터 꺼내쓰는 코드
app.use(express.json())
app.use(express.urlencoded({extended:true}))

//mongodb 설정
const { MongoClient } = require('mongodb')

let db
const url = 'mongodb+srv://gurrl8356:GkshHY0tGPnS3c2i@cluster0.jir28.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
new MongoClient(url).connect().then((client)=>{
    console.log('DB연결성공')
    db = client.db('forum')
}).catch((err)=>{
    console.log(err)
})
//몽고 디비용 객체 선언용
const { ObjectId } = require('mongodb')

//메소드 오버라이드 셋팅
const methodOverride = require('method-override')
app.use(methodOverride('_method'))

//passport라이브러리 설정
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

app.use(passport.initialize())
app.use(session({
    secret: '암호화에 쓸 비번', //암호화 키
    resave : false, //유저가 요청 날릴때마다 session데이터를 갱신할지 여부(false추천)
    saveUninitialized : false //유저가 로그인안해도 세션을 저장해둘지 여부(false추천)
}))

app.use(passport.session())



app.use(express.static(__dirname + '/public')) //css 파일 폴더 등록

app.listen(8080, () => {
    console.log('http://localhost:8080 에서 서버 실행중')
})

app.get('/', (요청, 응답) => {
    응답.send('반갑다')
})

app.get('/news', async (요청, 응답) => {
    let result = await db.collection('post').find().toArray()
    console.log(result[0].title)
})
app.get('/list', async (요청, 응답) => {
    let result = await db.collection('post').find().toArray()

    응답.render('list.ejs',{글목록: result}) //result데이터를 글목록이라는 이름으로 데이터전달
})

app.get('/write', async (요청,응답)=>{
    응답.render('write.ejs')

})

app.post('/add', async (요청,응답)=>{
    //console.log(요청.body)
    if(요청.body.title==''){
        응답.send("제목이없어")
    }else if(요청.body.content==''){
        응답.send("내용이없어")
    }
    try {
        //db에 데이터 저장
        await db.collection('post').insertOne({title:요청.body.title, content:요청.body.content});
        //응답.send('작성완료') //메시지 전달
        응답.redirect('/list')
    }catch (e){
        console.log(e)
        응답.send("db오류")
    }
})
//파라미터는 /:
app.get('/detail/:id', async (req,res)=>{

    try {
        //var id = req.params //유저 접속 파라미터
        let result = await db.collection('post').findOne({_id : new ObjectId(req.params.id)}) //db에 저장된 데이터중 1개를 가져옴
        if(result==null){
            res.status(404).send("not found")
        }else{
            res.render('detail.ejs',{result : result})//result라는 변수를 result라는 이름으로 데이터 전달
        }
    }catch (e){
        res.status(400).send('이상한 url')//4--이면 유저, 5--이면 서버잘못
    }

})

app.get('/edit/:id',async (req,res)=>{
        let result = await db.collection('post').findOne({_id:new ObjectId(req.params.id)})
        res.render('edit.ejs',{result : result})
})

app.put('/edit',async (req,res)=>{
    await db.collection('post').updateOne({_id : new ObjectId(req.body.id)},{$set:{title : req.body.title, content : req.body.content}}) // 수정
    res.redirect('/list')

    /*db.collection('post').updateOne(
        { _id : new ObjectId('수정할 document _id') },
        { $inc: { like : 1 } } //$inc는 +값을 해줌 음수면 마이너스
    )*/
})

app.delete('/delete', async (req, res) => {
    //console.log(req.query.docid)
    await db.collection('post').deleteOne({ _id : new ObjectId(req.query.docid)})
    res.send('삭제완료')
})

//페이지네이션
//파라미터 구현
/*
app.get('/list/:page', async (req, res) => {
    //let result = await db.collection('post').find().limit(5).toArray() //5개만 찾아와줌
    let result = await db.collection('post').find()
        .skip((req.params.page - 1)*5).limit(5).toArray() //맨 앞에 5개를 스킵하고 5개를 찾아옴
    res.render('list.ejs',{글목록: result}) //result데이터를 글목록이라는 이름으로 데이터전달
})*/

//다음버튼으로 구현
app.get('/list/:page', async (req, res) => {
    //let result = await db.collection('post').find().limit(5).toArray() //5개만 찾아와줌
    let result = await db.collection('post').find()
        .skip((req.params.page - 1)*5).limit(5).toArray() //맨 앞에 5개를 스킵하고 5개를 찾아옴
    res.render('list.ejs',{글목록: result}) //result데이터를 글목록이라는 이름으로 데이터전달
})
//페이지네이션으로 구성하고 다음버튼을 작동
app.get('/list/next/:id', async (req, res) => {
    let result = await db.collection('post')
        .find({ _id : {$gt : new ObjectId(req.params.id)}})
        .limit(5).toArray()
    res.render('list.ejs', { 글목록 : result })
})

//로그인
app.get('/login', async (req,res) =>{
    res.render('login.ejs')
})

//passport 라이브러리
passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db.collection('user').findOne({ username : 입력한아이디})
    if (!result) {
        return cb(null, false, { message: '아이디 DB에 없음' })
    }
    if (result.password == 입력한비번) {
        return cb(null, result)
    } else {
        return cb(null, false, { message: '비번불일치' });
    }
}))
//사용시 passport.authenticate('local')을 api안에서 쓰면 됨

app.post('/login', async (req,res,next) =>{
    passport.authenticate('local', (error, user, info) => {
        if (error) return res.status(500).json(error)
        if (!user) return res.status(401).json(info.message)
        req.logIn(user, (err) => {
            if (err) return next(err)
            res.redirect('/')
        })
    })(req, res, next)
})
