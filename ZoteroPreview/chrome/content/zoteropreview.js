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
	};

// customization start
function printArr(arr) {
	let str = "";
	for (let item of arr) {
		if (Array.isArray(item)) str += printArr(item);
		else if ((typeof item) === 'object') str += JSON.stringify(item) + ", ";
		else str += item + ", ";
	}
	return str;
}

if (typeof Zotero.ItemTreeView !== 'undefined') {	//zotero 5.*

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

} else {	//zotero 6.*
	Zotero.debug('zoteropreview: ItemTreeView zotero 6.*');
	const itemTree = require('zotero/itemTree');
	var getColumns_org = itemTree.prototype.getColumns;
	itemTree.prototype.getColumns = function () {
		const addColumns = [
			{
				dataKey: 'noteDetail',
				label: 'noteDetail',
				flex: '1',
				zoteroPersist: new Set(['width', 'hidden', 'sortDirection']),
			},
			{
				dataKey: 'tags',
				label: 'tags',
				flex: '1',
				zoteroPersist: new Set(['width', 'hidden', 'sortDirection']),
			}
		];
		
		var org=getColumns_org.apply(this, arguments);
		const insertAfter = org.findIndex(column => column.dataKey === 'title');
		org.splice(insertAfter + 1, 0, ...addColumns)
		return org;
	}
		
	var isFieldOfBase_org = Zotero.ItemFields.isFieldOfBase;
	Zotero.ItemFields.isFieldOfBase = function (field, _baseField) {
		if (['noteDetail', 'tags'].includes(field)) return false
		return isFieldOfBase_org.apply(this, arguments)
	}
		
	var getField_org = Zotero.Item.prototype.getField;
	Zotero.Item.prototype.getField = function (field, unformatted, includeBaseMapped) {
		try {
			switch (field) {
				case 'noteDetail':
					try {
						var note=Zotero.Items.get(this.id).getNote();	//getNote() can only be called on notes and attachments
						return note.substring(0,80).replace(/<[^>]+>/g, '');
					} catch (err) {
						return '';
					}
				case 'tags':
					str=""
					Zotero.Items.get(this.id).getTags().forEach(function (tag) {str+=tag.tag+","})
					return str.slice(0, -1);
			}
		} catch (err) {
			Zotero.debug('patched getField:', {field, unformatted, includeBaseMapped, err})
		}	
		return getField_org.apply(this, arguments)
	}
	// & "C:\Program Files\7-Zip\7z.exe" a -tzip "ZoteroPreview.xpi" ".\ZoteroPreview\*" -aoa
}	

// customization end

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
		
		if (items.length == 1 && Zotero.getActiveZoteroPane().document.getElementById('zotero-view-tabbox').selectedTab.id == 'zotero-editpane-preview-tab'){
			Zotero.debug("zoteropreview: updating citation");
			var qc = Zotero.QuickCopy;
			var format = qc.getFormatFromURL(qc.lastActiveURL);
			format = Zotero.QuickCopy.unserializeSetting(format);

			Zotero.debug("zoteropreview: " + JSON.stringify(format));
			
			if (format.mode == ""){
				format.mode = "bibliography";
			}

			var userpref = Zotero.Prefs.get('extensions.zoteropreview.citationstyle', true);
			// get the font size preference from the global setting
			var fontSizePref = Zotero.Prefs.get('fontSize');
			// Zotero.debug("format is: " + format);
			Zotero.debug("userpref is: " + userpref);
			
			if ( userpref != "" ){
				Zotero.debug("format: " + format["id"]);
				Zotero.debug("setting userpref");
				format.id = userpref;
				format.mode = "bibliography";
			}
			Zotero.debug("format is now: " + JSON.stringify(format));

			var msg = "No bibliography style is chosen in the settings for QuickCopy. Set Preview preference.";
			
			// added a pane in overlay.xul
			var iframe = Zotero.getActiveZoteroPane().document.getElementById('zoteropreview-preview-box');

			if (format.id == "" || format.mode == "export") {
			   iframe.contentDocument.documentElement.innerHTML = msg;
			   this.openPreferenceWindow();
			   return;
			}
			
			var biblio = qc.getContentFromItems(items, format);
			msg = '<h3>' + Zotero.getString('styles.bibliography') + '</h3>' + biblio.html;
			//msg += "<p><a href=\"#\" onclick=\"Zotero.zoteropreview.copyCitation(true);\">" + Zotero.getString('general.copy') + "</a></p>";

			Zotero.debug("zoteropreview: " + msg);

			var locale = format.locale ? format.locale : Zotero.Prefs.get('export.quickCopy.locale');
			
			Zotero.debug("format is: " + format);
			
			var style = Zotero.Styles.get(format.id);
			var styleEngine = style.getCiteProc(locale, 'html');
			
			var citations = styleEngine.previewCitationCluster(
				{
					citationItems: items.map(item => ({ id: item.id })),
					properties: {}
				},
				[], [], "html"
			);
			styleEngine.free();

			msg =  '<h4 style="border-bottom:1px solid #eeeeee">' + style.title + "</h4>" + msg;
			msg += '<h3 style="border-top:1px solid #eeeeee">' + Zotero.getString('styles.editor.output.individualCitations') + '</h3>' + citations;
			// msg += "<p><a href=\"#\" onclick=\"Zotero.zoteropreview.copyCitation(false);\">" + Zotero.getString('general.copy') + "</a></p>";
			Zotero.debug("zoteropreview: " + msg);


			// working on copy
			
			// var asCitations = true; // in text
			// Zotero_File_Interface.copyItemsToClipboard(
			// 	items, format.id, locale, format.contentType == 'html', asCitations
			// );
			// asCitations = false; // bibliography
			// Zotero_File_Interface.copyItemsToClipboard(
			// 	items, format.id, locale, format.contentType == 'html', asCitations
			// );

			// wrap the output in a div that has the font size preference
			msg = "<div style=\"font-size: " + fontSizePref + "em\">" + msg + "</div>";
			// Zotero.debug(msg);

			// https://github.com/zotero/zotero/blob/master/chrome/content/zotero/tools/cslpreview.js
			// https://github.com/zotero/zotero/blob/master/chrome/content/zotero/tools/cslpreview.xul

			// Zotero_CSL_Editor.generateBibliography(styleEngine);

			if (iframe.contentDocument.documentElement.innerHTML != msg){
				iframe.contentDocument.documentElement.innerHTML = msg;	
			}
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

	this.copyCitation = function(asCitations){
		// true = citation
		// false = bib
		var qc = Zotero.QuickCopy;
		var items = Zotero.getActiveZoteroPane().getSelectedItems();
		var format = qc.getFormatFromURL(qc.lastActiveURL);
		format = qc.unserializeSetting(format);
		var locale = format.locale ? format.locale : Zotero.Prefs.get('export.quickCopy.locale');
		var userpref = Zotero.Prefs.get('extensions.zoteropreview.citationstyle', true);
		if ( userpref != "" ){
			format.id = userpref;
		}
		Zotero_File_Interface.copyItemsToClipboard(
			 	items, format.id, locale, format.contentType == 'html', asCitations
		);
	};
	
};


