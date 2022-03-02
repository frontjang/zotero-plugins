// completely different approach copied from zotfile

Zotero.zoteropreview = new function() {
	this.lastPreviewItemKey=null;
	this.currentStyle = "";
	
	 /**
     * Initiate zoteropreview
	 * called from include.js
	 * adds a select listener to the main window
     * @return {void}
     */
	this.init = async function () {
		Zotero.debug("zoteropreview: init");
		await Zotero.Schema.schemaUpdatePromise;
		await Zotero.uiReadyPromise;
		
/* 		// Register the callback in Zotero as an item observer
		var notifierID = Zotero.Notifier.registerObserver({
				notify: async function (event, type, ids, extraData) {
					Zotero.debug('notifying');
					//Zotero.zoteropreview.getCitationPreview('notification');
					deferred.resolve(extraData[ids[0]]);
					deferred.resolve(Zotero.zoteropreview.getCitationPreview('notification'));
				}
			}, ['item','collection-item','collection'], "test");
 
		// Unregister callback when the window closes (important to avoid a memory leak)
		window.addEventListener('unload', function(e) {
				Zotero.Notifier.unregisterObserver(notifierID);
		}, false); */

		// thanks to https://github.com/diegodlh/zotero-cita/blob/b64f963ae22ba27f05da5436f8fb162a039e4cb8/src/zoteroOverlay.jsx
		Zotero.uiReadyPromise.then(
            () => {
                debug('Adding getCitationPreview listener to ZoteroPane.itemsView "select" listeners');
                ZoteroPane.itemsView.onSelect.addListener(Zotero.zoteropreview.getCitationPreview);
            }
        );

		// probably a massive hack, but it works, oh and zotfile does something like this it turns out
		// do not know how to hook into chrome/content/zotero/itemPane.js for "viewItem" code
		// so just listen for a select - tried all kinds of things before this
		if(window.ZoteroPane && Zotero.version.indexOf('5')==0) {
			var doc = window.ZoteroPane.document;
			//window.ZoteroPane.itemsView.onSelectionChange.addListener(Zotero.zoteropreview.getCitationPreview,'zoteropreview1');
			//window.ZoteroPane.collectionsView.itemTreeView.onSelect.addListener(Zotero.zoteropreview.listenerTesting,'zoteropreview2');
			doc.addEventListener("select", function(){
				//Zotero.debug('zoteropreview: select');
				Zotero.zoteropreview.getCitationPreview('select');
			});
			doc.addEventListener("click", function(){
				//Zotero.debug('zoteropreview: click');
				Zotero.zoteropreview.getCitationPreview('click');
			});
			doc.addEventListener("focus", function(){
				//Zotero.debug('zoteropreview: focus');
				Zotero.zoteropreview.getCitationPreview('focus');
				
			});
			window.ZoteroPane.document.getElementById('zotero-items-tree').addEventListener("focus", function(){
				//Zotero.debug('zoteropreview: focus new');
				Zotero.zoteropreview.getCitationPreview('focus new');
			});
			window.ZoteroPane.document.getElementById('zotero-items-tree').addEventListener("click", function(){
				//Zotero.debug('zoteropreview: click new');
				Zotero.zoteropreview.getCitationPreview('click new');
			});
		}
		
		
// customization start

var original_getCellText = Zotero.ItemTreeView.prototype.getCellText;
Zotero.ItemTreeView.prototype.getCellText = function(row, col) {
	// row: number
	// col: object
	if (col.id === 'zotero-items-column-noteDetail') {
		const item = this.getRow(row).ref;
		/*if (item.isNote() || item.isAttachment() || (item.isAnnotation != null ? item.isAnnotation() : null)) {
			return ''
		}*/
		return item.getNote().substring(0,80).replace(/<[^>]+>/g, '');
	}
	else if (col.id === 'zotero-items-column-tags') {
		const item = this.getRow(row).ref
		str=""
		item.getTags().forEach(function (tag) {str+=tag.tag+","})
		return str.slice(0, -1);
	}
	else return original_getCellText.apply(this, arguments);
}

// customization end
  
	};
	
	this.notifierCallback = function(){
		this.notify = function (event, type, ids, extraData) {
				Zotero.debug('zoteropreview: notify');
				Zotero.zoteropreview.getCitationPreview();				
		}
	};
	
	this.listenerTesting = function(testParam){
		Zotero.debug('zoteropreview: ' + testParam);
		Zotero.debug('zoteropreview: listenerTesting');
		Zotero.zoteropreview.getCitationPreview();
	};

// customization start

this.openAttachment = async function(opt) {
	var item=Zotero.getActiveZoteroPane().getSelectedItems()[0];
	
	if(opt=="openFile"){
		var file=await item.getFilePathAsync();
		Zotero.launchFile(file);
	}
	else if (opt=="openFolder"){
		var file=await item.getFilePathAsync();
		Zotero.File.pathToFile(file).reveal()
	}
	else if(opt=="openUrl"){
		if(item.getField('url').length>0) Zotero.launchURL(item.getField('url'));
	}
	else if(opt=="modifyUrl"){
		//https://udn.realityripple.com/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIPromptService#prompt()
		var promptText = { value: item.getField('url') };
		var prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
		var pressedOK = prompts.prompt(null,"Input URL","New URL",promptText,null,{})
		if(pressedOK) {
			item.setField('url', promptText.value);
			item.saveTx();
		}
	}
}

this.getCitationPreview2 = async function(){
	Zotero.debug('zoteropreview: getCitationPreview2');

	if(Zotero.zoteropreview.lastPreviewItemKey != Zotero.getActiveZoteroPane().getSelectedItems()[0].key) {
		Zotero.debug('zoteropreview: getCitationPreview2 index is not 5');

		const zoteroPane = Zotero.getActiveZoteroPane();
		let att = zoteroPane.getSelectedItems()[0];
		let path=att.getFilePath();
		if (path.indexOf('mx-wc')>0) {
			Zotero.getActiveZoteroPane().document.getElementById('zoteropreview2-preview-box').src="file://"+path;
			Zotero.getActiveZoteroPane().document.getElementById('zotero-item-pane-content').selectedIndex=5;
			Zotero.zoteropreview.lastPreviewItemKey=Zotero.getActiveZoteroPane().getSelectedItems()[0].key;
		}
	}
};

this.addAttachment = async function(path) {
	Zotero.debug('zoteropreview: addAttachment');
	let rows = await Zotero.DB.queryAsync("SELECT collectionID, parentCollectionID, collectionName FROM collections where collectionName is 'Webpage'");
	//var path="Z:\\clippings\\mx-wc\\생각들\\2022-01-12-1641918068\\index.html";
	let data = await Zotero.File.getContentsAsync(path);
	var title = data.match(/<title[^>]*>(.+)<\/title>/)[1];
	var url=data.match(/OriginalSrc: (.+) --/)[1];
	let text=data.replace(/(\r\n|\n|\r)/gm, "").replace(/(<head.+\/head>)/g, "").replace(/<[^>]+>/g, '').replace(/\s\s+/g, ' ').trim();
	var attachment = await Zotero.Attachments.linkFromFile({
	file: path,
	title: title,
	collections: [rows[0].collectionID]
	});
	attachment.setNote(text);
	attachment.setField('url', url);
	await attachment.saveTx();
};

// customization end


	/**
	* Primary function to generate the preview
	* called from a number of places, but primarily on selection change
	* @return {void}
	*/
	this.getCitationPreview = async function(debugParam){
		Zotero.debug('zoteropreview: getCitationPreview testing ' + debugParam);
		Zotero.zoteropreview.getCitationPreview2();		
		
		// see https://www.zotero.org/support/dev/client_coding/javascript_api#managing_citations_and_bibliographies
		var items = Zotero.getActiveZoteroPane().getSelectedItems();
		
		if (items.length == 1 && Zotero.getActiveZoteroPane().document.getElementById('zotero-view-tabbox').selectedIndex == 4){
			Zotero.debug("zoteropreview: updating citation");
			var qc = Zotero.QuickCopy;
			var format = Zotero.Prefs.get("export.quickCopy.setting");
			var userpref = Zotero.Prefs.get('extensions.zoteropreview.citationstyle', true);
			// get the font size preference from the global setting
			var fontSizePref = Zotero.Prefs.get('fontSize');
			// Zotero.debug("format is: " + format);
			// Zotero.debug("userpref is: " + userpref);
			
			if ( userpref != "" ){
				format = "bibliography=" + userpref;
			}
			// Zotero.debug("format is now: " + format);

			var msg = "No bibliography style is chosen in the settings for QuickCopy.";
			
			// added a pane in overlay.xul
			var iframe = Zotero.getActiveZoteroPane().document.getElementById('zoteropreview-preview-box');

			if (format.split("=")[0] !== "bibliography") {
			   iframe.contentDocument.documentElement.innerHTML = msg;
			   this.openPreferenceWindow();
			   return;
			}
			var biblio = qc.getContentFromItems(items, format);
			msg = biblio.html;
			// wrap the output in a div that has the font size preference
			msg = "<div style=\"font-size: " + fontSizePref + "em\">" + msg + "</div>";
			// Zotero.debug(msg);

			// https://github.com/zotero/zotero/blob/master/chrome/content/zotero/tools/cslpreview.js
			// https://github.com/zotero/zotero/blob/master/chrome/content/zotero/tools/cslpreview.xul
			
			iframe.contentDocument.documentElement.innerHTML = msg;	
		}
		Zotero.debug('zoteropreview: getCitationPreview done');
		Zotero.debug('-------------------');
	};
	
	 /**
     * Open zoteropreview preference window
	 * this took way too long to work out how to do, mostly because of a typo in styleChooser.xul ;-)
     */
    this.openPreferenceWindow = function(paneID, action) {
        // var io = {pane: paneID, action: action};
		// Zotero.debug(prefWindow);
		// Zotero.debug(window.title);
        var prefWindow = window.openDialog('chrome://zoteropreview/content/styleChooser.xul',
            'zoteropreview-stylechooser',
            'chrome,centerscreen,scrollbars=yes,resizable=yes');
    };
	
};


