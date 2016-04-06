Ext.define('KwfExt.editWindow.WindowController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.KwfExt.editWindow.window',

    focusOnEditSelector: 'field',
    bindable: null,
    autoSync: true,

    deleteConfirmText: 'Do you really wish to remove this entry?',
    deleteConfirmTitle: 'Delete',
    addTitle: 'Add',
    editTitle: 'Edit',
    saveChangesTitle: 'Save',
    saveChangesMsg: 'Do you want to save the changes?',

    init: function()
    {
/*
        if (!this.view) Ext.Error.raise('view is required');
        if (!(this.view instanceof Ext.window.Window)) Ext.Error.raise('view needs to be a Ext.window.Window');

        if (!this.bindable) {
            //by default (most common case) get form
            this.bindable = this.view.down('> form');
        }
        if (!this.bindable) Ext.Error.raise('bindable config is required');
        if (!this.bindable.isBindableController && this.bindable.getController) {
            this.bindable = this.bindable.getController();
        }
        if (!this.bindable.isBindableController) {
            Ext.Error.raise('bindable config needs to be a Densa.mvc.bindable.Interface');
        }

        this.view.on('beforeclose', function() {
            this.onCancelClick();
            return false;
        }, this);

        this.bindable.view.on('savesuccess', function() {
            this.fireViewEvent('savesuccess');
        }, this);
*/
    },
/*
    //store is optional, used for sync
    openEditWindow: function(row, store)
    {
        this._loadedStore = store;
        if (row.phantom) {
            this.view.setTitle(this.addTitle);
        } else {
            this.view.setTitle(this.editTitle);
        }
        this.view.show();
        this.bindable.load(row, store);
        if (this.focusOnEditSelector) {
            this.view.down(this.focusOnEditSelector).focus();
        }
    },
*/
    validateAndSubmit: function(options)
    {
        return this.bindable.validateAndSubmit(options);
    },

    doSave: function()
    {
/*
        return this.bindable.allowSave().then({
            success: function() {

                var row = this.bindable.getLoadedRecord();
                if (row.phantom && this._loadedStore
                    && this._loadedStore.indexOf(row) == -1
                ) {
                    this._loadedStore.add(row);
                }

                if (this.autoSync) {
                    if (this._loadedStore) {
                        var syncQueue = new Densa.data.StoreSyncQueue();
                        syncQueue.add(this._loadedStore); //sync store first
                        this.bindable.save(syncQueue);    //then bindables (so bindable grid is synced second)
                                                        //bindable forms can still update the row as the sync is not yet started
                        syncQueue.start({
                            success: function() {
                                this.fireViewEvent('savesuccess');
                            },
                            scope: this
                        });
                    } else {
                        this.bindable.save();
                        this.bindable.getLoadedRecord().save({
                            callback: function(records, operation, success) {
                                if (success) this.fireViewEvent('savesuccess');
                            },
                            scope: this
                        });
                    }
                } else {
                    this.bindable.save();
                }
                this.fireViewEvent('save');

            },
            scope: this
        });
*/
    },

    onSave: function()
    {
        var session = this.getSession();
        if (session.getChanges()) {
            var batch;
            if (session.getParent()) {
                session.save();
                batch = session.getParent().getSaveBatch();

                //create new session, destroy current one
                var newSession = session.getParent().spawn();
//                 console.log('set new session', newSession);
                parentSessionView.setSession(newSession);
                parentSessionView.getViewModel().setSession(newSession); //TODO might not have viewmodel? children might have viewmodel?
                session.destroy();

            } else {
                batch = session.getSaveBatch();
            }
            batch.start();
        } else {
//             console.log('no changes');
        }
        /*
        this.doSave().then({
            success: function() {
                this.closeWindow();
            },
            scope: this
        });
        */
    },

    onCancel: function()
    {
        if (this.bindable.isDirty()) {
            Ext.Msg.show({
                title: this.saveChangesTitle,
                msg: this.saveChangesMsg,
                icon: Ext.MessageBox.QUESTION,
                buttons: Ext.Msg.YESNOCANCEL,
                fn: function(btn) {
                    if (btn == 'no') {
                        if (this._loadedStore && this.getLoadedRecord().phantom) {
                            this._loadedStore.remove(this.getLoadedRecord());
                        }
                        this.closeWindow();
                    } else if (btn == 'yes') {
                        this.doSave().then({
                            success: function() {
                                this.closeWindow();
                            },
                            scope: this
                        });
                    }
                },
                scope: this
            });
        } else {
            if (this._loadedStore && this.getLoadedRecord().phantom) {
                this._loadedStore.remove(this.getLoadedRecord());
            }
            this.closeWindow();
        }
    },

    closeWindow: function()
    {
        this.view.hide();
        this.bindable.reset();
    },

    getLoadedRecord: function()
    {
        if (this.bindable) {
            return this.bindable.getLoadedRecord();
        } else {
            return null;
        }
    },

    onDelete: function()
    {
        this.bindable.allowDelete().then({
            success: function() {
                if (this.autoSync) {
                    Ext.Msg.show({
                        title: this.deleteConfirmTitle,
                        msg: this.deleteConfirmText,
                        icon: Ext.MessageBox.QUESTION,
                        buttons: Ext.Msg.YESNO,
                        scope: this,
                        fn: function(button) {
                            if (button == 'yes') {
                                if (this._loadedStore) {
                                    this._loadedStore.remove(this.getLoadedRecord());
                                    this._loadedStore.sync();
                                } else {
                                    this.getLoadedRecord().destory();
                                }
                                this.closeWindow();
                            }
                        }
                    });
                } else {
                    if (!this._loadedStore) {
                        Ext.Error.raise("Can't delete record without store");
                    }
                    this._loadedStore.remove(this.getLoadedRecord());
                    this.closeWindow();
                }
            },
            scope: this
        });
    }

});
