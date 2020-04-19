// undirbúningsskipanir
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000

// gerum breytu til að halda utan um fjölda notenda
var numUsers = 0;

// leyfum appinu okkar að fá aðganga að css skjalinu (þessi skipun myndi líka leyfa aðgang að öðrum
// hlutum eins og t.d. myndum ef við erum með png/jpeg skrár sem við viljum nota)
app.use(express.static('./'));
// gerum rútu og sendum þeim sem þangað kemur rétt html skjal
app.get('/', function(req, res){
	res.sendFile(__dirname+'/index.html');
});

// breyta sem geymir merki spilara
var player = "X";
// látum tölvuna alltaf vera O-ið
computerMark = "O";
// gerum fylki sem geymir reitina
var leikbord = ["","","","","","","","",""];

io.on('connection', function(socket){
	socket.mark = player;
	// seinna myndum við svo skipta um spilara ef við værum með 2 menn en ekki 1 mann og tölvu
	//switchPlayer();
	numUsers++;
	console.log('a user has connected');
	console.log('Number of users currently connected: '+numUsers);
	socket.on('disconnect', function(socket){
		numUsers--;
		console.log('a user has disconnected');
		console.log('Number of users currently connected: '+numUsers);
	});
	// hlustum eftir move atburði, sem segir okkur að einhver spilari vilji leika leik
	socket.on('move', function(boxId){
		playerMove(socket, boxId);
	});
	// hlustum eftir restart atburði, sem segir okkur að einhver spilari vilji hefja nýjan leik
	socket.on('nyrLeikur', function(){
		init();
	});
});

http.listen(port, function(){
	console.log('server is listening on port: '+port);
});

/*
var bord = document.getElementById("tafla");
bord.addEventListener('click', playerMove);
var byrjaTakki = document.getElementById("byrja_leik");
byrjaTakki.addEventListener('click', init);
*/

function init(){
	// núllstillum spilara
	player = "X";
	// núllstillum tölvu
	computerMark = "O";
	// núllstillum leikborð
	leikbord = ["","","","","","","","",""];
	// núllstillum svo það sem birtist hjá notendum 
	io.emit('nyrLeikur');
}

function switchPlayer(){
	if (player == "X"){
		player = "O";
	} else {
		player = "X";
	}
}

function legalMove(boxId){
	// grunngildið verður true ef það kemur ekki í ljós að leikurinn sé ólöglegur
	var result = true;
	// ef reiturinn var ekki tómur
	if (leikbord[boxId] == "X" || leikbord[boxId] == "O") {
		// þá verður gildið false, sem þýðir að leikurinn er ólöglegur
		result = false;
	}
	return result;
}

function checkWin(mark){
	// skilum niðurstöðu, false ef við finnum ekki út að spilarinn hafi unnið
	var result = false;
	// gerum fylki með þeim hópum reita sem, ef allir reitirnir í hópnum eru eins, þá þýðir það að spilarinn 
	// hefur unnið leikinn, mark segir hér í raun til um hvaða spilara við erum að athuga í augnablikinu
	var sigurtilfelli = [
		[0,1,2],
		[3,4,5],
		[6,7,8],
		[0,3,6],
		[1,4,7],
		[2,5,8],
		[0,4,8],
		[2,4,6]
	]
	// gerum svo teljara sem verður 3 ef og aðeins ef 3 reitir í röð eru eins
	var counter = 0;
	for (var i=0; i<8; i++){
		// byrjum á nýju innra fylki og því núllstillum við teljarann okkar
		counter = 0;
		for (var j=0; j<3; j++){
			// finnum númer reits
			var reitaNúmer = sigurtilfelli[i][j];			
			// finnum reit með þetta númer
			var reitur = leikbord[reitaNúmer];
			// athugum hvort reitur með þetta númer er með merki spilara
			if (reitur == mark){
				counter++;
			}
		}
		// ef það gerist einhvern tíman að teljarinn verði að 3, þá hefur spilarinn unnið
		if (counter == 3){
			result = true;
		}
	}
	return result;
}

function playerMove(socket, boxId){	
	//io.emit('playerMove', socket.mark, box);
	if (legalMove(boxId)){
		// þetta er löglegt þá sendum við öllum mönnum nýja leikinn
		io.emit('playerMove', socket.mark, boxId);
		// og uppfærum okkar útgáfu af borðinu
		leikbord[boxId] = socket.mark;
		// athugum hvort spilarinn hafi unnið
		if (checkWin(socket.mark)){
			io.emit('win', socket.mark);
			init();
		} else {
			// leyfum tölvunni að leika, eftir smá tíma fyrir umhugsun auðvitað :P
			setTimeout(computerMove, 750);
		}		
	} else {
		// en ef þetta er ólöglegur leikur þá látum við þann mann sem átti leik vita
		socket.emit('illegal');
	}

	
}

function computerMove(){
	// gerum tómt fylki
	var emptyCells = [];
	// göngum yfir reiti og bætum tómum reitum við fylkið okkar
	for (var i=0; i<leikbord.length; i++){		
		if (legalMove(i)) {
			emptyCells.push(i);
		}		
	}
	// veljum stak af handahófi úr tóma fylkinu okkar, stökin í því eru númer staka í leikborðinu okkar
	var randomMove = emptyCells[Math.floor(Math.random()*emptyCells.length)];
	// og uppfærum okkar útgáfu af borðinu
	leikbord[randomMove] = computerMark;
	// látum spilarann sjá leik tölvunnar
	io.emit('computerMove', computerMark, randomMove);
	// athugum hvort tölvan hafi unnið
	if (checkWin(computerMark)){
		io.emit('win', computerMark);
		init();
	}
}

