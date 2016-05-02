Ext.define('KwfExt.editWindow.WindowController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.KwfExt.editWindow.window',

    focusOnEditSelector: 'field',
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
*/
        this.view.on('beforeclose', function() {
            this.onCancel();
            return false;
        }, this);

        this.view.on('show', function() {
            if (this.focusOnEditSelector) {
                this.view.down(this.focusOnEditSelector).focus();
            }
        }, this);
/*
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
    },
*/
/*
    validateAndSubmit: function(options)
    {
        return this.bindable.validateAndSubmit(options);
    },
*/
    //TODO kopie von SaveButtonController, das gehört vereinheitlicht - wie auch immer
    doSave: function()
    {
        var deferred = new Ext.Deferred()

        var promise = Ext.Promise.resolve();
        Ext.each(this.view.query('[controller]'), function(i) {
            if (i.getController().isSaveable) {
                promise = promise.then(function() {
                    return i.getController().allowSave();
                });
            }
        }, this);

        promise = promise.then((function() {
            //console.log('all valid. save now');
            var session = this.getSession();
            if (session.getChangesForParent()) {
                //console.log('changes', session.getChangesForParent());
                var batch;
                if (session.getParent()) {
                    //console.log('save to parent');
                    session.save();
                    batch = session.getParent().getSaveBatch();
                } else {
                    batch = session.getSaveBatch();
                }
                batch.on('complete', function() {
                    this.view.unmask();
                    if (!batch.hasException()) {
                        deferred.resolve();
                    } else {
                        deferred.reject();
                    }
                }, this);
                this.view.mask('Saving...');
                batch.start();

                session.commit(); //mark session clean
            } else {
                //console.log('no changes');
                deferred.resolve();
            }
        }).bind(this), (function(error) {
            Ext.Msg.alert(trlKwf('Save'), error.validationMessage);
            deferred.reject();
        }).bind(this));

        return deferred.promise;
    },

    onSave: function()
    {
        this.doSave().then((function() {
            this.closeWindow();
        }).bind(this));
    },

    onCancel: function()
    {
        var session = this.getSession();
        var record = this.view.getRecord();

        var isPhantom = record.phantom;
        record.phantom = false;
        var hasChanges = session.getChangesForParent() != null;
        record.phantom = isPhantom;

        if (hasChanges) {
            //console.log('changes', this.getSession().getChangesForParent());
            Ext.Msg.show({
                title: this.saveChangesTitle,
                msg: this.saveChangesMsg,
                icon: Ext.MessageBox.QUESTION,
                buttons: Ext.Msg.YESNOCANCEL,
                fn: function(btn) {
                    if (btn == 'no') {
                        var record = this.view.getRecord();
                        if (record.phantom) {
                            record.drop();
                        }

                        //create new session to destroy all made changes
                        var newSession;
                        if (session.getParent()) {
                            newSession = session.getParent().spawn();
                        } else {
                            newSession = new Ext.data.Session({
                                schema: session.getSchema()
                            });
                        }
//                             console.log('set new session', newSession);
                        this.view.setSession(newSession);
                        this.getViewModel().setSession(newSession);
                        Ext.each(this.view.query("[viewModel]"), function(i) {
                            if (i.getViewModel().getSession() == session) {
                                i.getViewModel().setSession(newSession);
                            }
                        }, this);
                        session.destroy();

                        this.closeWindow();
                    } else if (btn == 'yes') {
                        this.doSave().then((function() {
                            this.closeWindow();
                        }).bind(this));
                    }
                },
                scope: this
            });
        } else {
            var record = this.view.getRecord();
            if (record.phantom) {
                record.drop();
            }
            this.closeWindow();
        }
    },

    closeWindow: function()
    {
        this.view.hide();
    },

    onDelete: function()
    {
        Ext.Msg.show({
            title: this.deleteConfirmTitle,
            msg: this.deleteConfirmText,
            icon: Ext.MessageBox.QUESTION,
            buttons: Ext.Msg.YESNO,
            scope: this,
            fn: function(button) {
                if (button == 'yes') {
                    this.getView().getRecord().drop();

                    var session = this.getSession();
                    var batch;
                    if (session.getParent()) {
                        session.save();
                        batch = session.getParent().getSaveBatch();
                    } else {
                        batch = session.getSaveBatch();
                    }
                    batch.on('complete', function() {
                        this.view.unmask();
                        if (!batch.hasException()) {
                            this.closeWindow();
                        }
                    }, this);
                    this.view.mask(trlKwf('Deleting...'));
                    batch.start();

                    session.commit(); //mark session clean
                }
            }
        });
    }

});
