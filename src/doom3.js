function Game(canvasPath, consoleOutputPath, consoleInputPath, consoleButtonPath){
    this.display = new Display($(canvasPath)[0]);
    this.console = new Console($(consoleInputPath)[0], $(consoleOutputPath)[0], $(consoleButtonPath)[0]);
}