import React, { useState } from 'react';
import {
  BadgeCheck,
  Check,
  FileText,
  Image as ImageIcon,
  MapPin,
  Paperclip,
  Send,
  Tag,
  Video,
  X,
} from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type {
  ChatMessage,
  Conversation,
  DealOfferCard,
  RfqRequest,
  UserSession,
} from '../types/dropp';
import { formatFcfa } from '../utils/formatters';
import { uploadSignedMedia } from '../utils/cloudinary';
import { canBuy, canCreateRfq, canRespondToRfq, canSendMessage } from '../utils/permissions';

interface MessagesScreenProps {
  t: DroppDictionary;
  session: UserSession | null;
  conversations: Conversation[];
  rfqs: RfqRequest[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onSendMessage: (
    conversationId: string,
    payload: {
      kind: ChatMessage['kind'];
      text: string;
      mediaUrl?: string;
      fileName?: string;
      locationLabel?: string;
      offer?: DealOfferCard;
    }
  ) => void;
  onRespondOffer: (
    conversationId: string,
    messageId: string,
    decision: 'accepted' | 'declined'
  ) => void;
  onOpenCart: () => void;
  onOpenRfqModal: () => void;
  onOpenAuth: () => void;
}

export const MessagesScreen: React.FC<MessagesScreenProps> = ({
  t,
  session,
  conversations,
  rfqs,
  activeConversationId,
  onSelectConversation,
  onSendMessage,
  onRespondOffer,
  onOpenCart,
  onOpenRfqModal,
  onOpenAuth,
}) => {
  const [subTab, setSubTab] = useState<'chats' | 'rfqs'>('chats');
  const [draft, setDraft] = useState('');
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerTitle, setOfferTitle] = useState('Lot Mixte Personnalisé');
  const [offerQty, setOfferQty] = useState('20');
  const [offerPrice, setOfferPrice] = useState('11500');
  const [offerShipping, setOfferShipping] = useState('2000');
  const [offerNote, setOfferNote] = useState('Expédition sous 24 h avec facture');
  const [attachError, setAttachError] = useState('');

  const allowChatWrite = canSendMessage(session);
  const allowCreateOffer = canRespondToRfq(session);
  const allowRfqCreate = canCreateRfq(session);
  const allowBuyerOrder = canBuy(session);

  const selectedId = activeConversationId || conversations[0]?.conversationId || null;
  const activeConv = conversations.find((c) => c.conversationId === selectedId) || null;

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      onOpenAuth();
      return;
    }
    if (!allowChatWrite || !activeConv || !draft.trim()) return;
    onSendMessage(activeConv.conversationId, {
      kind: 'text',
      text: draft.trim(),
    });
    setDraft('');
  };

  const handleAttachment = (kind: 'image' | 'video' | 'file') => {
    if (!session) {
      onOpenAuth();
      return;
    }
    if (!allowChatWrite || !activeConv) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept =
      kind === 'image' ? 'image/*' : kind === 'video' ? 'video/*' : '.pdf,.doc,.docx,.xlsx';
    input.onchange = async () => {
      setAttachError('');
      const file = input.files?.[0];
      if (!file) return;
      const resourceType = kind === 'image' ? 'image' : kind === 'video' ? 'video' : 'raw';
      const uploaded = await uploadSignedMedia(file, resourceType, 'chat');
      if (!uploaded.ok) {
        setAttachError(uploaded.error);
        return;
      }
      onSendMessage(activeConv.conversationId, {
        kind,
        text: file.name,
        mediaUrl: uploaded.url,
        fileName: file.name,
      });
    };
    input.click();
  };

  const handleShareLocation = () => {
    if (!session) {
      onOpenAuth();
      return;
    }
    if (!allowChatWrite || !activeConv) return;
    onSendMessage(activeConv.conversationId, {
      kind: 'location',
      text: `Position partagée : ${session.city} · ${session.neighborhood}`,
      locationLabel: `${session.city} (${session.neighborhood})`,
    });
  };

  const handleSendOfferCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !allowCreateOffer || !activeConv) return;
    const qty = Math.max(1, Number(offerQty) || 1);
    const unitPrice = Math.max(100, Number(offerPrice) || 1000);
    const shipping = Math.max(0, Number(offerShipping) || 0);
    onSendMessage(activeConv.conversationId, {
      kind: 'offer',
      text: `${offerTitle} — ${qty} × ${formatFcfa(unitPrice)}`,
      offer: {
        offerId: `OFF-${Date.now().toString().slice(-5)}`,
        productTitle: offerTitle.trim(),
        shopId: activeConv.shopId,
        shopName: activeConv.shopName,
        qty,
        unitPriceFcfa: unitPrice,
        shippingFeeFcfa: shipping,
        note: offerNote.trim(),
        status: 'pending',
      },
    });
    setShowOfferForm(false);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--dropp-bg)] pb-16 lg:pb-0">
      {/* Header */}
      <header className="px-4 py-3.5 border-b border-[var(--dropp-border)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--dropp-text)]">{t.messages.title}</h1>
          <p className="text-xs text-[var(--dropp-muted)]">{t.messages.subtitle}</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)]">
          <button
            type="button"
            onClick={() => setSubTab('chats')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold ${
              subTab === 'chats'
                ? 'bg-[var(--dropp-text)] text-[var(--dropp-bg)]'
                : 'text-[var(--dropp-muted)] hover:text-[var(--dropp-text)]'
            }`}
          >
            {t.messages.tabChats} ({conversations.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('rfqs')}
            className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold ${
              subTab === 'rfqs'
                ? 'bg-[var(--dropp-text)] text-[var(--dropp-bg)]'
                : 'text-[var(--dropp-muted)] hover:text-[var(--dropp-text)]'
            }`}
          >
            {t.messages.tabRfqs} ({rfqs.length})
          </button>
        </div>
      </header>

      {!session ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm w-full p-6 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-center space-y-4">
            <p className="text-sm text-[var(--dropp-muted)]">{t.messages.loginPrompt}</p>
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full min-h-[44px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-sm font-bold"
            >
              {t.profile.loginCta}
            </button>
          </div>
        </div>
      ) : subTab === 'rfqs' ? (
        <div className="flex-1 overflow-y-auto p-5 max-w-3xl w-full mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--dropp-text)]">{t.rfq.title}</h2>
            {allowRfqCreate && (
              <button
                type="button"
                onClick={onOpenRfqModal}
                className="min-h-[40px] px-4 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
              >
                {t.rfq.createBtn}
              </button>
            )}
          </div>
          {rfqs.map((r) => (
            <div
              key={r.rfqId}
              className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="text-xs text-[var(--dropp-muted)]">
                  {r.rfqId} · {r.city} · {r.quantity} {t.sheets.pcsUnit}
                </div>
                <div className="text-sm font-bold text-[var(--dropp-text)]">{r.title}</div>
                <div className="text-xs text-[var(--dropp-accent)] font-semibold tabular-nums mt-0.5">
                  {formatFcfa(r.budgetFcfa)} · {r.offers.length} {t.rfq.offersCountLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenRfqModal}
                className="min-h-[40px] px-3.5 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-xs font-semibold text-[var(--dropp-text)] shrink-0"
              >
                {t.actions.accept}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation list */}
          <aside className="w-full sm:w-72 border-r border-[var(--dropp-border)] overflow-y-auto shrink-0">
            {conversations.length === 0 ? (
              <p className="p-6 text-xs text-[var(--dropp-muted)] text-center">{t.messages.noConversations}</p>
            ) : (
              conversations.map((conv) => {
                const active = conv.conversationId === activeConv?.conversationId;
                return (
                  <button
                    key={conv.conversationId}
                    type="button"
                    onClick={() => onSelectConversation(conv.conversationId)}
                    className={`w-full p-3.5 border-b border-[var(--dropp-border)] flex items-center gap-3 text-left transition-colors ${
                      active ? 'bg-[var(--dropp-surface)]' : 'hover:bg-[var(--dropp-surface)]/60'
                    }`}
                  >
                    <img
                      src={conv.shopAvatarUrl}
                      alt={conv.shopName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover shrink-0 border border-[var(--dropp-border-strong)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <span className="text-xs font-bold text-[var(--dropp-text)]">
                            {conv.shopName}
                          </span>
                          {conv.shopCertified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-[var(--dropp-accent)] shrink-0" aria-hidden="true" />
                          )}
                        </span>
                        <span className="text-[10px] text-[var(--dropp-accent)] font-medium shrink-0">
                          {conv.shopOnline ? t.messages.onlineLabel : t.messages.offlineLabel}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--dropp-muted)] truncate mt-0.5">
                        {conv.lastMessageText}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </aside>

          {/* Active Thread */}
          {activeConv && (
            <section className="hidden sm:flex flex-1 flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--dropp-border)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={activeConv.shopAvatarUrl}
                    alt={activeConv.shopName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-[var(--dropp-text)]">
                        {activeConv.shopName}
                      </span>
                      {activeConv.shopCertified && (
                        <BadgeCheck className="w-4 h-4 text-[var(--dropp-accent)]" aria-hidden="true" />
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--dropp-accent)]">
                      {activeConv.shopOnline ? t.messages.onlineLabel : t.messages.offlineLabel}
                    </div>
                  </div>
                </div>

                {allowCreateOffer && (
                  <button
                    type="button"
                    onClick={() => setShowOfferForm((v) => !v)}
                    className="min-h-[40px] px-3 rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border-strong)] hover:border-[var(--dropp-accent)] text-xs font-semibold text-[var(--dropp-text)] inline-flex items-center gap-1.5"
                  >
                    <Tag className="w-3.5 h-3.5 text-[var(--dropp-accent)]" aria-hidden="true" />
                    <span>{t.messages.sendOfferBtn}</span>
                  </button>
                )}
              </div>

              {showOfferForm && (
                <form
                  onSubmit={handleSendOfferCard}
                  className="p-4 bg-[var(--dropp-surface)] border-b border-[var(--dropp-border)] grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end"
                >
                  <label className="col-span-2 text-xs text-[var(--dropp-muted)] space-y-1">
                    <span>{t.messages.offerProductLabel}</span>
                    <input
                      type="text"
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      required
                      className="w-full min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                    />
                  </label>
                  <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                    <span>{t.messages.offerQtyLabel}</span>
                    <input
                      type="number"
                      min={1}
                      value={offerQty}
                      onChange={(e) => setOfferQty(e.target.value)}
                      required
                      className="w-full min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                    />
                  </label>
                  <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                    <span>{t.messages.offerUnitPriceLabel}</span>
                    <input
                      type="number"
                      min={100}
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      required
                      className="w-full min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                    />
                  </label>
                  <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                    <span>{t.messages.offerShippingLabel}</span>
                    <input
                      type="number"
                      min={0}
                      value={offerShipping}
                      onChange={(e) => setOfferShipping(e.target.value)}
                      className="w-full min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                    />
                  </label>
                  <label className="col-span-2 text-xs text-[var(--dropp-muted)] space-y-1">
                    <span>{t.messages.offerNoteLabel}</span>
                    <input
                      type="text"
                      value={offerNote}
                      onChange={(e) => setOfferNote(e.target.value)}
                      className="w-full min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                    />
                  </label>
                  <button
                    type="submit"
                    className="min-h-[40px] px-3 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
                  >
                    {t.actions.submit}
                  </button>
                </form>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeConv.messages.map((msg) => {
                  const isMine = msg.senderId === session.uid;
                  return (
                    <div
                      key={msg.messageId}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      {msg.kind === 'offer' && msg.offer ? (
                        <div className="max-w-sm w-full rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-accent)]/60 p-4 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[var(--dropp-accent)]">
                              {t.messages.offerCardTitle}
                            </span>
                            <span className="text-[var(--dropp-muted)]">
                              {msg.offer.status === 'accepted'
                                ? t.messages.offerAccepted
                                : msg.offer.status === 'declined'
                                ? t.messages.offerDeclined
                                : t.messages.offerPending}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-[var(--dropp-text)]">
                            {msg.offer.productTitle}
                          </div>
                          <div className="text-xs text-[var(--dropp-muted)] tabular-nums">
                            {msg.offer.qty} {t.sheets.pcsUnit} × {formatFcfa(msg.offer.unitPriceFcfa)} ={' '}
                            <span className="font-bold text-[var(--dropp-text)]">
                              {formatFcfa(msg.offer.qty * msg.offer.unitPriceFcfa)}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--dropp-muted)]">{msg.offer.note}</p>

                          {msg.offer.status === 'pending' &&
                            allowBuyerOrder &&
                            activeConv.buyerId === session.uid && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() =>
                                  onRespondOffer(activeConv.conversationId, msg.messageId, 'accepted')
                                }
                                className="min-h-[40px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold inline-flex items-center justify-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t.actions.accept}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onRespondOffer(activeConv.conversationId, msg.messageId, 'declined')
                                }
                                className="min-h-[40px] rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-[var(--dropp-text)] text-xs font-semibold inline-flex items-center justify-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t.actions.decline}</span>
                              </button>
                            </div>
                          )}

                          {msg.offer.status === 'accepted' && allowBuyerOrder && (
                            <button
                              type="button"
                              onClick={onOpenCart}
                              className="w-full min-h-[40px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
                            >
                              {t.messages.offerToOrderBtn}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`max-w-md px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMine
                              ? 'bg-[#FF5A1F] text-white font-medium'
                              : 'bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-[var(--dropp-text)]'
                          }`}
                        >
                          {msg.kind === 'image' && msg.mediaUrl && (
                            <img
                              src={msg.mediaUrl}
                              alt={msg.fileName || 'Image'}
                              className="max-h-44 rounded-lg mb-1.5 object-cover"
                            />
                          )}
                          {msg.kind === 'video' && msg.mediaUrl && (
                            <video
                              src={msg.mediaUrl}
                              controls
                              className="max-h-44 rounded-lg mb-1.5"
                            />
                          )}
                          {msg.kind === 'file' && (
                            <div className="flex items-center gap-1.5 font-semibold mb-1">
                              <FileText className="w-4 h-4" aria-hidden="true" />
                              <span>{msg.fileName}</span>
                            </div>
                          )}
                          {msg.kind === 'location' && (
                            <div className="flex items-center gap-1.5 font-semibold mb-1">
                              <MapPin className="w-4 h-4" aria-hidden="true" />
                              <span>{msg.locationLabel}</span>
                            </div>
                          )}
                          <p>{msg.text}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Composer */}
              {allowChatWrite ? (
                <div className="p-3 border-t border-[var(--dropp-border)] space-y-2">
                  {attachError && (
                    <p className="text-xs text-[#B42328] dark:text-[#FCA5A5]">{attachError}</p>
                  )}
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => handleAttachment('image')}
                      className="min-h-[36px] px-3 rounded-lg bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-[11px] text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] inline-flex items-center gap-1.5"
                    >
                      <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.messages.attachPhoto}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachment('video')}
                      className="min-h-[36px] px-3 rounded-lg bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-[11px] text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] inline-flex items-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.messages.attachVideo}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachment('file')}
                      className="min-h-[36px] px-3 rounded-lg bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-[11px] text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] inline-flex items-center gap-1.5"
                    >
                      <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.messages.attachFile}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShareLocation}
                      className="min-h-[36px] px-3 rounded-lg bg-[var(--dropp-surface)] border border-[var(--dropp-border)] text-[11px] text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] inline-flex items-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.messages.shareLocation}</span>
                    </button>
                  </div>

                  <form onSubmit={handleSendText} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={t.messages.messagePlaceholder}
                      aria-label={t.messages.messagePlaceholder}
                      className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)] placeholder:text-[var(--dropp-muted)] focus:outline-none focus:border-[var(--dropp-accent)]"
                    />
                    <button
                      type="submit"
                      aria-label={t.messages.sendBtn}
                      className="min-w-[44px] min-h-[44px] px-4 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white flex items-center justify-center"
                    >
                      <Send className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-3 border-t border-[var(--dropp-border)] text-xs text-[#FCA5A5] text-center">
                  {t.errors.suspendedBlocked}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};
