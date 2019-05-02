function Game(canvasPath, consoleOutputPath, consoleInputPath){
    this.display = new Display($(canvasPath)[0]);
    this.console = new Console($(consoleInputPath)[0], $(consoleOutputPath)[0]);
}