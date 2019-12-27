var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var info = document.getElementById("instructions");
var resetButton = document.getElementById("reset");
var pauseButton = document.getElementById("pause");

// The blocks that are controlled in the game are both instances of the player class.
function player(x, y, type) { 
    this.x = x;
    this.y = y;
    this.type = type; // The type controls whether the block is blue or red.
    this.size = 20;
    this.xspeedMagnitude = 1.5; // This represents the speed the player will move at when moving left or right.
    this.yspeed = 0;
    this.jumpSpeed = 3; // When a player jumps, their yspeed is set to this value.
    this.gravity = 0.08; // Controls downward acceleration.
    this.falling = false;
    this.left = false; // Represents whether the player is moving left.
    this.right = false; // Represents whether the player is moving right.
    this.canJump = true; 
    this.wantJump = false; // Represents whether the player has just pressed the up arrow (red block) or "w" (blue block) to try to jump.
    this.done = false; // Represents whether the player is currently on the last platform of the level.
    this.draw = function () {
        if (this.type === 1) {
            ctx.fillStyle = "#ff0000"; // Red
        } else if (this.type === 2) {
            ctx.fillStyle = "#0000ff"; // Blue
        } else if (this.type === 3) {
            ctx.fillStyle = "00ff00"; // Green--this was never used
        }
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.fillStyle = "#000000"; //Black
    };
    this.update = function (otherPlayer) {
        if (this.right && this.x + this.size < 500) { // Moves right unless that would go over the rightmost border.
            this.x += this.xspeedMagnitude;
            if (checkOverlap(this.x + this.xspeedMagnitude, this.y, otherPlayer.x, otherPlayer.y, this.size)) {
                otherPlayer.x += this.xspeedMagnitude; // If this player is pushing on another player, that player is moved right as well.
            }
        }
        if (this.left && this.x > 0) { // Same as above but for left.
            this.x -= this.xspeedMagnitude;
            if (checkOverlap(this.x - this.xspeedMagnitude, this.y, otherPlayer.x, otherPlayer.y, this.size)) {
                otherPlayer.x -= this.xspeedMagnitude;
            }
        }
        this.y -= this.yspeed;
        if (this.y < otherPlayer.y && checkOverlap(this.x, this.y, otherPlayer.x, otherPlayer.y, this.size)) { // Accounts for vertical collisions between the blocks.
            this.y = otherPlayer.y - this.size;
            this.yspeed = otherPlayer.yspeed;
        }
        if (this.falling) { 
            if (this.yspeed > -2) { // Max falling speed is set to 2 here because otherwise the block can fall fast enough to completely pass through a platform in a single frame, which leads to errors in collision detection.
                this.yspeed -= this.gravity;
            }
        } else if (!this.falling) { // This could be an else but left in for clarity.
            if (this.yspeed < 0) {
                this.yspeed = 0;
            }
        }
        if (this.y > 500) { // Checks for falling off the screen.
            lose = true;
        }
        if (this.wantJump && this.canJump) {
            this.jump();
        }
    };
    /* 
    A player can only jump if they are not currently falling. In addition, canJump regulates the fact that a player has to unpress the jump key before they can jump (the up arrow or w key cannot be held down to jump continuously).
    */
    this.jump = function (otherPlayer) { 
        if (!this.falling) {
            this.yspeed = this.jumpSpeed;
            this.wantJump = false;
            this.canJump = false;
        }
    };
    /* 
    Checks if a player block is on a platform or on another block. It also checks if the player has lost by jumping on a forbidden platform (ex. a blue player cannot jump on a red platform).
    */
    this.checkFall = function (platforms, otherPlayer) { 
        var result; // Stores whether or not the player is falling.
        this.done = false;
        for (var a = 0; a < platforms.length; a++) {
            if (checkOverlapRect(this.x, this.y, this.size, this.size, platforms[a].x, platforms[a].y, platforms[a].length, platforms[a].height)) {
                if (platforms[a].type !== 0 && platforms[a].type !== this.type) {
                    lose = true;
                }
            }
            if (this.x + this.size > platforms[a].x && platforms[a].x + platforms[a].length > this.x) {
                if (this.y + this.size - platforms[a].y <= 2 && this.y + this.size - platforms[a].y >= -0.5) {
                    this.y = platforms[a].y - this.size; // When a player falls, sometimes they can sink into a platform slightly if they are moving fast enough. This line of code corrects for that so that blocks are always right on top of a platform.
                    if (this.yspeed < 0) {
                        this.yspeed = 0;
                    }
                    if (platforms[a].type !== 0 && platforms[a].type !== this.type) {
                        lose = true;
                    } else {
                        result = false;
                        if (a === platforms.length - 1) {
                            this.done = true;
                        }
                    }
                }
            }
        }
        if (this.yspeed < 0 && !otherPlayer.fall && checkOverlap(this.x, this.y - this.yspeed, otherPlayer.x, otherPlayer.y, this.size)) { // In addition to landing on a platform, a block also stops falling if it lands on another block.
            result = false;
            if (this.yspeed < 0) {
                this.yspeed = 0;
            }
        }
        if (result !== false) {
            result = true;
        }
        this.falling = result;
    };
}

function platform(x, y, length, type, last) {
    this.x = x;
    this.y = y;
    this.type = type; // The type controls to color of the platform and the types of blocks that can jump on it.
    this.length = length;
    this.height = 5;
    this.draw = function () {
        if (this.type === 1) {
            ctx.fillStyle = "#ff0000"; // Red
        } else if (this.type === 2) {
            ctx.fillStyle = "#0000ff"; // Blue
        } else if (this.type === 3) {
            ctx.fillStyle = "#00ff00"; // Green
        }
        if (last) {
            ctx.fillStyle = "#b35900"; // Brown
        }
        ctx.fillRect(this.x, this.y, this.length, this.height);
        ctx.fillStyle = "#000000"; // Black
    };
}


// Checks if two squares with side lengths of s are overlapping.
function checkOverlap(x1, y1, x2, y2, s) { 
    var xDif = Math.abs(x1 - x2);
    var yDif = Math.abs(y1 - y2);
    if (xDif < s && yDif < s) {
        return true;
    }
    return false;
}



// Checks if two rectangles are overlapping.
function checkOverlapRect(x1, y1, w1, h1, x2, y2, w2, h2) { 
    return (x1 + w1 > x2 && x1 < x2 + w2 && y1 + h1 > y2 && y1 < y2 + h2);
}

/*
This function generates a level by resetting the positions of the blocks and resetting variables corresponding to movement.
By making the list "platforms" contain a specific sequence of platforms, the layout of the level is set up.
*/
function genLevel(level) { 
    timeOut = false;
    timer[0] = false;
    pause = false;
    p.x = 250;
    p.y = 470;
    p.yspeed = 0;
    p2.x = 230;
    p2.y = 470;
    p2.yspeed = 0;
    p.left = false;
    p.right = false;
    p.wantJump = false;
    p.canJump = true;
    p2.left = false;
    p2.right = false;
    p2.wantJump = false;
    p2.canJump = true;
    p.done = false;
    p2.done = false;
    win = false;
    lose = false;
    justLost = true;
    if (level === 1) {
        platforms = [
            new platform(220, 490, 60, 0),
            new platform(150, 430, 50, 2),
            new platform(320, 430, 50, 1),
            new platform(130, 370, 50, 2),
            new platform(180, 370, 100, 3),
            new platform(280, 370, 50, 1),
            new platform(170, 310, 50, 2),
            new platform(220, 310, 100, 3),
            new platform(320, 310, 50, 1),
            new platform(130, 250, 50, 2),
            new platform(180, 250, 100, 3),
            new platform(280, 250, 50, 1),
            new platform(170, 190, 50, 2),
            new platform(220, 190, 100, 3),
            new platform(320, 190, 50, 1),
            new platform(240, 140, 20, 0),
            new platform(200, 100, 100, 0, true),
        ];
    } else if (level === 2) {
        platforms = [
            new platform(200, 490, 100, 0),
            new platform(200, 440, 20, 2),
            new platform(240, 440, 50, 3),
            new platform(130, 440, 50, 3),
            new platform(220, 300, 50, 3),
            new platform(300, 400, 50, 3),
            new platform(300, 220, 50, 3),
            new platform(400, 350, 50, 3),
            new platform(180, 400, 20, 2),
            new platform(260, 360, 20, 2),
            new platform(300, 310, 20, 2),
            new platform(350, 270, 20, 2),
            new platform(450, 270, 20, 2),
            new platform(440, 220, 20, 0),
            new platform(340, 170, 20, 0),
            new platform(240, 140, 20, 0),
            new platform(400, 450, 20, 1),
            new platform(400, 400, 20, 1),
            new platform(350, 350, 20, 1),
            new platform(410, 300, 20, 1),
            new platform(200, 100, 100, 0, true),
        ];
    } else if (level === 3) {
        platforms = [
            new platform(0, 490, 500, 0),
            new platform(0, 440, 280, 3),
            new platform(280, 440, 25, 0),
            new platform(305, 440, 200, 3),
            new platform(330, 400, 50, 1),
            new platform(80, 370, 200, 2),
            new platform(70, 340, 50, 1),
            new platform(90, 290, 100, 0),
            new platform(240, 280, 50, 2),
            new platform(300, 230, 20, 0),
            new platform(260, 200, 15, 0),
            new platform(210, 160, 10, 0),
            new platform(200, 100, 100, 0, true)
        ];
    } else if (level === 4) {
        platforms = [
            new platform(200, 490, 100, 0),
            new platform(100, 450, 20, 1),
            new platform(200, 450, 20, 3),
            new platform(300, 450, 20, 2),
            new platform(400, 450, 20, 1),
            new platform(50, 400, 20, 0),
            new platform(150, 400, 20, 2),
            new platform(250, 420, 20, 1),
            new platform(350, 400, 20, 3),
            new platform(450, 400, 20, 2),
            new platform(100, 350, 20, 1),
            new platform(200, 350, 20, 0),
            new platform(300, 350, 20, 2),
            new platform(400, 350, 20, 1),
            new platform(50, 300, 20, 3),
            new platform(150, 300, 20, 2),
            new platform(250, 320, 20, 1),
            new platform(350, 300, 20, 0),
            new platform(450, 300, 20, 2),
            new platform(100, 250, 20, 1),
            new platform(200, 250, 20, 3),
            new platform(300, 250, 20, 2),
            new platform(400, 250, 20, 1),
            new platform(50, 200, 20, 0),
            new platform(150, 200, 20, 2),
            new platform(250, 220, 20, 1),
            new platform(350, 200, 20, 1),
            new platform(450, 200, 20, 2),
            new platform(230, 150, 40, 0),
            new platform(200, 100, 100, 0, true)
        ];
    } else if (level === 5) {
        platforms = [
            new platform(0, 490, 500, 0),
            new platform(0, 440, 170, 3),
            new platform(170, 440, 30, 0),
            new platform(200, 440, 300, 3),
            new platform(0, 390, 180, 3),
            new platform(180, 390, 30, 0),
            new platform(210, 390, 290, 3),
            new platform(0, 340, 175, 3),
            new platform(175, 340, 30, 0),
            new platform(205, 340, 295, 3),
            new platform(0, 290, 170, 3),
            new platform(170, 290, 30, 0),
            new platform(200, 290, 300, 3),
            new platform(220, 260, 50, 1),
            new platform(280, 230, 50, 2),
            new platform(200, 200, 50, 1),
            new platform(270, 170, 50, 2),
            new platform(200, 140, 50, 1),
            new platform(220, 100, 100, 0, true)
        ];
    } else if (level === 6) {
        platforms = [
            new platform(200, 490, 100, 0),
            new platform(130, 450, 50, 0),
            new platform(35, 400, 50, 3),
            new platform(85, 400, 50, 0),
            new platform(135, 400, 165, 3),
            new platform(35, 350, 50, 3),
            new platform(85, 350, 50, 0),
            new platform(135, 350, 50, 3),
            new platform(35, 300, 50, 3),
            new platform(85, 300, 50, 0),
            new platform(135, 300, 50, 3),
            new platform(35, 250, 50, 3),
            new platform(85, 250, 50, 0),
            new platform(135, 250, 50, 3),
            new platform(35, 200, 50, 3),
            new platform(85, 200, 50, 0),
            new platform(135, 200, 50, 3),
            new platform(300, 400, 25, 1),
            new platform(325, 400, 175, 3),
            new platform(370, 365, 25, 2),
            new platform(420, 330, 25, 1),
            new platform(450, 295, 25, 2),
            new platform(400, 260, 25, 1),
            new platform(350, 225, 25, 2),
            new platform(400, 190, 25, 1),
            new platform(350, 155, 25, 2),
            new platform(320, 125, 25, 0),
            new platform(200, 100, 100, 0, true)
        ];
    } else if (level === 7) {
        p.x = 50;
        p.y = 80;
        p2.x = 70;
        p2.y = 80;
        platforms = [
            new platform(30, 100, 80, 0),
            new platform(0, 180, 150, 3),
            new platform(190, 180, 150, 3),
            new platform(0, 260, 120, 3),
            new platform(160, 260, 150, 3),
            new platform(0, 340, 160, 3),
            new platform(200, 340, 150, 3),
            new platform(0, 420, 120, 3),
            new platform(160, 420, 150, 3),
            new platform(80, 490, 280, 0),
            new platform(400, 450, 25, 1),
            new platform(460, 390, 25, 1),
            new platform(400, 340, 25, 1),
            new platform(445, 280, 25, 1),
            new platform(405, 230, 25, 1),
            new platform(460, 180, 25, 1),
            new platform(420, 130, 35, 0),
            new platform(390, 100, 100, 0, true)
        ];
    } else if (level === 8) {
        timer[0] = true;
        timer[1] = 4500;
        p.x = 50;
        p.y = 470;
        p2.x = 70;
        p2.y = 470;
        platforms = [
            new platform(30, 490, 80, 0),
            new platform(100, 430, 30, 2),
            new platform(230, 490, 20, 3),
            new platform(250, 490, 30, 1),
            new platform(280, 490, 20, 3),
            new platform(340, 490, 20, 3),
            new platform(360, 490, 30, 2),
            new platform(390, 490, 20, 3),
            new platform(430, 440, 30, 0),
            new platform(420, 390, 30, 2),
            new platform(350, 390, 10, 1),
            new platform(280, 390, 10, 2),
            new platform(230, 360, 10, 1),
            new platform(190, 330, 10, 2),
            new platform(140, 270, 30, 0),
            new platform(90, 220, 20, 3),
            new platform(110, 220, 30, 2),
            new platform(140, 220, 30, 3),
            new platform(170, 220, 30, 1),
            new platform(200, 220, 20, 3),
            new platform(140, 170, 30, 0),
            new platform(110, 135, 30, 1),
            new platform(180, 100, 100, 0, true)
        ];
    } else if (level === 9) {
        timer[0] = true;
        timer[1] = 8500;
        p.x = 50;
        p2.x = 70;
        platforms = [
            new platform(30, 490, 80, 0),
            new platform(20, 460, 37, 3),
            new platform(83, 460, 37, 3),
            new platform(20, 440, 30, 1),
            new platform(90, 440, 30, 2),
            new platform(50, 380, 40, 0),
            new platform(20, 340, 37, 3),
            new platform(83, 340, 37, 3),
            new platform(20, 320, 30, 2),
            new platform(90, 320, 30, 1),
            new platform(50, 260, 40, 0),
            new platform(20, 220, 37, 3),
            new platform(83, 220, 37, 3),
            new platform(20, 200, 30, 1),
            new platform(90, 200, 30, 2),
            new platform(50, 140, 40, 0),
            new platform(20, 100, 37, 3),
            new platform(83, 100, 37, 3),
            new platform(20, 80, 30, 1),
            new platform(90, 80, 30, 2),
            new platform(330, 480, 20, 3),
            new platform(350, 480, 24, 0),
            new platform(374, 480, 20, 3),
            new platform(380, 390, 60, 3),
            new platform(390, 440, 30, 1),
            new platform(430, 480, 30, 2),
            new platform(465, 440, 30, 2),
            new platform(440, 400, 30, 1),
            new platform(440, 350, 30, 0),
            new platform(320, 300, 100, 3),
            new platform(320, 250, 100, 3),
            new platform(430, 300, 60, 0, true)
        ];
    } else {
        winGame = true;
    }
}

var lose = false;
var win = false;
var winGame = false;
var p = new player(250, 470, 1);
var p2 = new player(230, 470, 2);
var level = 1;
var deaths = 0;
var time = 0;
var justLost = true;
var start = false;
var dispInstructions = false;
var score;
var pause = false;
var timer = [false, 0];
var timeOut = false;
var platforms;


// Level Test Mode: by uncommenting this block I can skip the menu and start the game at a specific level. // This was useful when I was designing the levels.
/*
level=9;
start=true;
genLevel(level);
*/


info.addEventListener("click", function () {
    dispInstructions = !dispInstructions;
});

resetButton.addEventListener("click", function () {
    document.location.reload();
});

pauseButton.addEventListener("click", function () {
    pause = !pause;
});

// Controls responses to keys being pressed.
document.addEventListener("keydown", function () {
    var key = event.keyCode;
    event.preventDefault();
    if (key === 82 && lose) { // "r" key
        genLevel(level);
    }
    if (key === 13 && !start && !dispInstructions) { // enter key
        start = true;
        deaths = 0;
        time = 0;
        genLevel(level);
    }
    if (key === 77) { // "m" key
        document.location.reload();
    }
    if (key === 73) { // "i" key
        dispInstructions = !dispInstructions;
    }
    if (!lose && !win) {
        if (key === 37) { // left arrow
            p.left = true;
        }
        if (key === 39) { // right arrow
            p.right = true;
        }
        if (key === 38) { // up arrow
            p.wantJump = true;
        }
        if (key === 65) { // "a" key
            p2.left = true;
        }
        if (key === 68) { // "d" key
            p2.right = true;
        }
        if (key === 87) { // "w" key
            p2.wantJump = true;
        }
        if (key === 80) { //"p" key
            pause = !pause;
        }
    }
});

// Controls responses to keys being released.
document.addEventListener("keyup", function () {
    var key = event.keyCode;
    event.preventDefault();
    if (!lose && !win) {
        if (key === 37) { // left arrow
            p.left = false;
        }
        if (key === 39) { // right arrow
            p.right = false;
        }
        if (key === 65) { // "a" key
            p2.left = false;
        }
        if (key === 68) { // "d" key
            p2.right = false;
        }
        if (key === 38) { // up arrow
            p.wantJump = false;
            p.canJump = true; // canJump is set back to true only when the user stops pressing the up arrow--holding down the arrow does not make you jump more than once.
        }
        if (key === 87) { // "w" key
            p2.wantJump = false;
            p2.canJump = true;
        }
    }
});

// This is the main loop of the game.
setInterval(function () { 
    ctx.clearRect(0, 0, 500, 500);
    if (!win && !lose && !winGame && start && !dispInstructions) {
        justLost = true;
        p.draw();
        p2.draw();
        for (var a = 0; a < platforms.length; a++) {
            platforms[a].draw();
        }
        ctx.font = "14px Arial";
        ctx.fillText("Level: " + level, 5, 15);
        ctx.fillText("Deaths: " + deaths, 5, 30);
        ctx.fillText("Time: " + Math.floor(time), 5, 45);
        if (pause === false) {
            p.checkFall(platforms, p2);
            p.update(p2);
            p2.checkFall(platforms, p);
            p2.update(p);
            if (p.done && p2.done) {
                win = true;
            }
            time += 0.01;
            if (timer[0]) {
                timer[1] -= 1;
                if (timer[1] <= 0) {
                    lose = true;
                    timeOut = true;
                }
            }
        } else {
            ctx.fillText("Paused", 5, 60);
        }
        if (timer[0]) {
            ctx.font = "20px Arial";
            ctx.fillText(Math.ceil(timer[1] / 100), 240, 30);
        }
    } else if (dispInstructions) {
        ctx.font = "64px Arial";
        ctx.fillText("Instructions", 75, 75);
        ctx.font = "16px Arial";
        ctx.fillText("1. Use the left, right, and up arrows to control the red block", 20, 120);
        ctx.fillText('2. Use the "a", "d", and "w" keys to control the blue block', 20, 150);
        ctx.fillText("3. Both blocks can jump on black platforms", 20, 180);
        ctx.fillText("4. Jumping on green platforms will cause you to lose", 20, 210);
        ctx.fillText("5. The red block cannot jump on blue platforms, and vice versa", 20, 240);
        ctx.fillText("6. Get both blocks to the brown platform to win", 20, 270);
        ctx.fillText("7, Some later levels have a time limit", 20, 300);
        ctx.fillText("7. Your score equals your time plus 20 seconds per death", 20, 330);
        ctx.fillText("8. Try and get the lowest score possible", 20, 360);
        ctx.fillText("9. Use \"p\" to pause/unpause", 20, 390);
        ctx.fillText("10. Use \"m\" to reset the game and return to the main menu", 20, 420);
        ctx.font = "24px Arial";
        ctx.fillText('Press "i" to return to the game', 70, 460);
    } else if (winGame) {
        ctx.font = "72px Arial";
        ctx.fillText("You Win!", 100, 100);
        ctx.font = "36px Arial";
        ctx.fillText("Deaths: " + deaths, 100, 200);
        ctx.fillText("Time: " + Math.floor(time), 100, 275);
        score = Math.floor(time + 20 * deaths);
        ctx.fillText("Final Score: " + score, 100, 350);
    } else if (!start) {
        ctx.font = "64px Arial";
        ctx.fillText("Platform Game", 40, 75);
        ctx.font = "24px Arial";
        ctx.fillText('Press "Enter" to Start', 140, 150);
        ctx.fillText('If you do not know how to play, press "i"', 40, 225);
        ctx.font = "64px Arial";
    } else if (lose) {
        if (justLost === true) { // justLost makes sure the death counter only incriments once right after a player loses. Otherwise, the death counter would keep increasing continually until the user reset the level.
            justLost = false;
            deaths += 1;
        }
        ctx.font = "72px Arial";
        ctx.fillText("You Lose!", 90, 100);
        if (timeOut) {
            ctx.fillText("Time Expired", 30, 175)
            ctx.font = "36px Arial";
            ctx.fillText('Press "r" to Restart the Level', 20, 250);
            ctx.fillText('Current Death Total: ' + deaths, 80, 325);
        }
        else {
            ctx.font = "36px Arial";
            ctx.fillText('Press "r" to Restart the Level', 20, 175);
            ctx.fillText('Current Death Total: ' + deaths, 80, 250);
        }
    } else if (win) {
        level += 1;
        genLevel(level);
    }
}, 10);