// var NGI = NGI ||  {
// 	InspectorAgent: require('./InspectorAgent'),
// 	Module: require('./Module'),
// 	TreeView: require('./TreeView'),
// 	Service: require('./Service')
// };

var NGI = require('./NGI');

function App(node, modules) {
	var pane = window.ngInspector.pane;
	var app = this;
	var observer = new MutationObserver(function(mutations) {
		setTimeout(function() {
			for (var i = 0; i < mutations.length; i++) {
				var target = mutations[i].target;

				// Avoid responding to mutations in the extension UI
				if (!pane.contains(target)) {
					for (var f = 0; f < mutations[i].addedNodes.length; f++) {
						var addedNode = mutations[i].addedNodes[f];
						if (addedNode.classList && !addedNode.classList.contains('ngi-hl')) {
							NGI.InspectorAgent.inspectNode(app, addedNode);
						}
					}
				}
			}
		}, 4);
	});
	var observerConfig = { childList: true, subtree: true };

	this.startObserver = function() {
		observer.observe(node, observerConfig);
	};

	this.stopObserver = function() {
		observer.disconnect();
	};

	this.node = node;

	this.$injector = window.angular.element(node).data('$injector');

	if (!modules) {
		modules = [];
	} else if (typeof modules === typeof '') {
		modules = [modules];
	}

	var probes = [builtInProbe];
	this.registerProbe = function(probe) {
		probes.push(probe);
	};

	this.probe = function(node, scope, isIsolate) {
		for (var i = 0; i < probes.length; i++) {
			probes[i](node, scope, isIsolate);
		}
	};

	// Attempt to retrieve the property of the ngApp directive in the node from
	// one of the possible declarations to retrieve the AngularJS module defined
	// as the main dependency for the app. An anonymous ngApp is a valid use
	// case, so this is optional.
	var attrs = ['ng\\:app', 'ng-app', 'x-ng-app', 'data-ng-app'];
	var main;
	if ('getAttribute' in node) {
		for (var i = 0; i < attrs.length; i++) {
			if (node.hasAttribute(attrs[i])) {
				main = node.getAttribute(attrs[i]);
				break;
			}
		}
		if (main) {
			modules.push(main);
		}
	}

	// Register module dependencies
	for (var m = 0; m < modules.length; m++) {
		NGI.Module.register(this, modules[m]);
	}

	var label = main ? main : nodeRep(node);
	this.view = NGI.TreeView.appItem(label, node);
	window.ngInspector.pane.treeView.appendChild(this.view.element);
}

// This probe is registered by default in all apps, and probes nodes
// for AngularJS built-in directives that are not exposed in the _invokeQueue
// despite the 'ng' module being a default dependency
function builtInProbe(node, scope) {

	if (node === document) {
		node = document.getElementsByTagName('html')[0];
	}

	if (node && node.hasAttribute('ng-repeat')) {
		scope.view.addAnnotation('ngRepeat', NGI.Service.BUILTIN);
	}

	// Label ng-include scopes
	if (node && node.hasAttribute('ng-include')) {
		scope.view.addAnnotation('ngInclude', NGI.Service.BUILTIN);
	}

	// Label ng-if scopes
	if (node && node.hasAttribute('ng-if')) {
		scope.view.addAnnotation('ngIf', NGI.Service.BUILTIN);
	}

	// Label root scopes
	if (scope.ngScope.$root.$id === scope.ngScope.$id) {
		scope.view.addAnnotation('$rootScope', NGI.Service.BUILTIN);
	}

	// Label ng-transclude scopes
	if (node && node.parentNode && node.parentNode.hasAttribute &&
		node.parentNode.hasAttribute('ng-transclude')) {
		scope.view.addAnnotation('ngTransclude', NGI.Service.BUILTIN);
	}
}

var appCache = [];
App.bootstrap = function(node, modules) {
	for (var i = 0; i < appCache.length; i++) {
		if (appCache[i].node === node) {
			return appCache[i];
		}
	}
	var newApp = new App(node, modules);
	if (window.ngInspector.pane.visible) {
		NGI.InspectorAgent.inspectApp(newApp);
		newApp.startObserver();
	}
	appCache.push(newApp);
};

var didFindApps = false;

App.inspectApps = function() {
	if (!didFindApps) {
		NGI.InspectorAgent.findApps(App);
		didFindApps = true;
	}

	for (var i = 0; i < appCache.length; i++) {
		NGI.InspectorAgent.inspectApp(appCache[i]);
		appCache[i].startObserver();
	}
};

App.startObservers = function() {
	for (var i = 0; i < appCache.length; i++) {
		appCache[i].startObserver();
	}

};

App.stopObservers = function() {
	for (var i = 0; i < appCache.length; i++) {
		appCache[i].stopObserver();
	}
};

// Utility function that returns a DOM Node to be injected in the UI,
// displaying a user-friendly CSS selector-like representation of a DOM Node
// in the inspected application
function nodeRep(node) {
	var label = document.createElement('label');

	if (node === document) {
		label.textContent = 'document';
		return label;
	}

	// tag
	label.textContent = node.tagName.toLowerCase();

	// #id
	if (node.hasAttribute('id')) {
		var small = document.createElement('small');
		small.textContent = '#' + node.getAttribute('id');
		label.appendChild(small);
	}

	// .class.list
	var classList = node.className.split(/\s/);
	for (var i = 0; i < classList.length; i++) {
		var small = document.createElement('small');
		small.textContent = '.' + classList[i];
		label.appendChild(small);
	}

	return label;
}

// module.exports = App;
NGI.App = App;