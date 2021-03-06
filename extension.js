// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const babelType = require("@babel/types");
const prettier = require("prettier");
const setPageConfig = require('./utils/setPageConfig');
var mContext;
var params = {
	fileName: '',
	fullPath: '',
	pageTitle: '',
	navStyle: 'default'
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "taro-page-tpl-rc" is now active!');
	mContext = context;
	let disposable = vscode.commands.registerCommand('extension.createFunctionalComponent', function (param) {
		// 文件夹绝对路径
		const folderPath = param.fsPath;

		// 调出系统输入框获取组件名
		vscode.window.showInputBox({
			prompt: "请输入页面名称: ",
			placeHolder: "页面名称"
		}).then(value => {
			if (!value) return;

			params.fileName = value;
			params.fullPath = `${folderPath}/${params.fileName}`;
			vscode.window.showInputBox({
				prompt: "请输入页面标题: ",
				placeHolder: "页面标题"
			}).then(value => {
				if (!value) return;

				params.pageTitle = value;
				vscode.window.showQuickPick(
					[
						"custom",
						"default"
					],
					{
						canPickMany: false,
						ignoreFocusOut: true,
						matchOnDescription: true,
						matchOnDetail: true,
						placeHolder: '请选择导航栏类型'
					})
					.then(function (style) {
						params.navStyle = style;
						generatePage();
					});
			});
		});

	});

	context.subscriptions.push(disposable);
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() { }

var generatePage = function () {
	//建立目录
	fs.mkdir(params.fullPath, err => {
		if (err === null) {
			//拷贝文件
			var temp = path.join(mContext.extensionPath, 'template');
			fs.readdir(temp, {}, (err, data) => {
				if (err === null) {
					for (var index in data) {
						fs.copyFile(path.join(temp, String(data[index])), path.join(params.fullPath, String(data[index])), err => {
						});
					}
					// 修改index.config.js
					setPageConfig(params.fullPath, params.pageTitle, params.navStyle);
					// 修改app.config.js
					addPageRouter();
				}
			});
		} else {
			switch (err.code) {
				case 'EEXIST':
					vscode.window.showErrorMessage("该目录已经存在!");
					break;
				default:
					vscode.window.showErrorMessage("未知错误，错误代码：" + err.code);
					break;
			}
		}
	});
}

var addPageRouter = function () {
	const srcSplit = params.fullPath.split("src/");
	const appConfigPath = `${srcSplit[0]}src/app.config.js`;
	const pageRoute = srcSplit[1] + '/index';

	fs.readFile(appConfigPath, "utf-8", (err, content) => {
		const ast = parser.parse(content, {
			sourceType: "module",
			plugins: [
				"jsx",
				"flow",
				"json",
			],
		});
		traverse(ast, {
			enter(path) {
				if (path.node.name === 'pages') {
					const pageParentPath = path.parentPath.node;
					const nodeNew = babelType.stringLiteralTypeAnnotation(pageRoute);
					pageParentPath.value.elements.push(nodeNew);
					const result = generate(
						ast,
						{
							jsonCompatibleStrings: true,
							retainLines: true,
						},
						content
					);
					prettier.resolveConfig(appConfigPath).then((options) => {
						const formateText = prettier.format(result.code, {
							parser: 'babel'
						});
						//写入文件
						fs.writeFile(appConfigPath, formateText, (err) => {
							if (err) {
								console.log(err);
							} else {
								// 弹出成功框
								vscode.window.showInformationMessage("该页面已经生成成功!");
							}
						});
					}).catch((err) => {
						console.log(err);
					});
				}
			}
		})
	});

}

module.exports = {
	activate,
	deactivate
}
