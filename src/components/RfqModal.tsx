import React, { useState } from 'react';
import { BadgeCheck, FileText, Plus, X } from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import type { MarketplaceCategory, RfqRequest, UserSession } from '../types/dropp';
import { formatFcfa } from '../utils/formatters';
import { uploadSignedMedia } from '../utils/cloudinary';

interface RfqModalProps {
  t: DroppDictionary;
  session: UserSession | null;
  rfqs: RfqRequest[];
  onRequireAuth: () => void;
  onCreateRfq: (payload: {
    title: string;
    description: string;
    category: MarketplaceCategory;
    quantity: number;
    budgetFcfa: number;
    deadlineDays: number;
    city: string;
    photoUrl?: string;
  }) => void;
  onSubmitOffer: (
    rfqId: string,
    unitPriceFcfa: number,
    deliveryDays: number,
    message: string
  ) => void;
  onAcceptOffer: (rfqId: string, offerId: string) => void;
  onOpenCart: () => void;
  onClose: () => void;
}

export const RfqModal: React.FC<RfqModalProps> = ({
  t,
  session,
  rfqs,
  onRequireAuth,
  onCreateRfq,
  onSubmitOffer,
  onAcceptOffer,
  onOpenCart,
  onClose,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory>('Mode');
  const [quantity, setQuantity] = useState('30');
  const [budgetFcfa, setBudgetFcfa] = useState('350000');
  const [deadlineDays, setDeadlineDays] = useState('5');
  const [city, setCity] = useState(session?.city || 'Douala');
  const [photoUrl, setPhotoUrl] = useState('');

  const [replyingRfqId, setReplyingRfqId] = useState<string | null>(null);
  const [offerPrice, setOfferPrice] = useState('10000');
  const [offerDays, setOfferDays] = useState('3');
  const [offerMsg, setOfferMsg] = useState('Disponible en stock, facture pro forma incluse.');

  const isVendor = session?.role === 'vendor' || session?.role === 'admin';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadSignedMedia(file, 'image');
    setPhotoUrl(res.url);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      onRequireAuth();
      return;
    }
    if (!title.trim() || !description.trim()) return;
    onCreateRfq({
      title,
      description,
      category,
      quantity: Math.max(1, Number(quantity) || 1),
      budgetFcfa: Math.max(1000, Number(budgetFcfa) || 1000),
      deadlineDays: Math.max(1, Number(deadlineDays) || 3),
      city,
      photoUrl: photoUrl || undefined,
    });
    setTitle('');
    setDescription('');
    setPhotoUrl('');
    setShowCreateForm(false);
  };

  const handleReplySubmit = (e: React.FormEvent, rfqId: string) => {
    e.preventDefault();
    onSubmitOffer(
      rfqId,
      Math.max(100, Number(offerPrice) || 1000),
      Math.max(1, Number(offerDays) || 2),
      offerMsg
    );
    setReplyingRfqId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.rfq.title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[var(--dropp-elevated)] border border-[var(--dropp-border)] rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--dropp-border)]">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[var(--dropp-accent)]" aria-hidden="true" />
            <div>
              <h2 className="text-base font-bold text-[var(--dropp-text)]">{t.rfq.title}</h2>
              <p className="text-xs text-[var(--dropp-muted)]">{t.rfq.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!session) {
                  onRequireAuth();
                  return;
                }
                setShowCreateForm((v) => !v);
              }}
              className="min-h-[40px] px-3.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{t.rfq.createBtn}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.actions.close}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] hover:bg-[var(--dropp-surface-alt)]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {showCreateForm && (
            <form
              onSubmit={handleCreate}
              className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                  <span>{t.rfq.formTitleLabel}</span>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                  />
                </label>
                <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                  <span>{t.auth.cityLabel}</span>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                  >
                    <option value="Douala">Douala</option>
                    <option value="Yaoundé">Yaoundé</option>
                    <option value="Bafoussam">Bafoussam</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs text-[var(--dropp-muted)] space-y-1">
                <span>{t.rfq.formDescLabel}</span>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)] text-xs"
                />
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                  <span>{t.rfq.formQtyLabel}</span>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                  />
                </label>
                <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                  <span>{t.rfq.formBudgetLabel}</span>
                  <input
                    type="number"
                    min={1000}
                    value={budgetFcfa}
                    onChange={(e) => setBudgetFcfa(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                  />
                </label>
                <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                  <span>{t.rfq.formDeadlineLabel}</span>
                  <input
                    type="number"
                    min={1}
                    value={deadlineDays}
                    onChange={(e) => setDeadlineDays(e.target.value)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                  />
                </label>
                <label className="text-xs text-[var(--dropp-muted)] space-y-1">
                  <span>Catégorie</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MarketplaceCategory)}
                    className="w-full min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-[var(--dropp-text)]"
                  >
                    <option value="Mode">Mode</option>
                    <option value="Électronique">Électronique</option>
                    <option value="Beauté">Beauté</option>
                    <option value="Alimentation">Alimentation</option>
                    <option value="Maison">Maison</option>
                    <option value="Autre">Autre</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs text-[var(--dropp-muted)] space-y-1">
                <span>{t.rfq.formPhotoLabel}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="block text-xs text-[var(--dropp-muted)]"
                />
              </label>

              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
              >
                {t.rfq.submitRfqBtn}
              </button>
            </form>
          )}

          {rfqs.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--dropp-muted)]">{t.rfq.noRfqs}</p>
          ) : (
            <div className="space-y-4">
              {rfqs.map((rfq) => (
                <div
                  key={rfq.rfqId}
                  className="p-4 rounded-2xl bg-[var(--dropp-surface)] border border-[var(--dropp-border)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-[var(--dropp-muted)]">
                        {rfq.rfqId} · {rfq.category} · {rfq.city} · {rfq.quantity}{' '}
                        {t.sheets.pcsUnit} · {rfq.deadlineDays}j
                      </div>
                      <h3 className="text-sm font-bold text-[var(--dropp-text)] mt-0.5">{rfq.title}</h3>
                      <p className="text-xs text-[var(--dropp-muted)] mt-1">{rfq.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-[var(--dropp-accent)] tabular-nums">
                        {formatFcfa(rfq.budgetFcfa)}
                      </div>
                      <div className="text-[11px] text-[var(--dropp-muted)]">
                        {rfq.status === 'awarded' ? t.rfq.statusAwarded : t.rfq.statusOpen}
                      </div>
                    </div>
                  </div>

                  {/* Vendor offers comparison */}
                  {rfq.offers.length > 0 && (
                    <div className="space-y-2 border-t border-[var(--dropp-border)] pt-3">
                      <div className="text-xs font-semibold text-[var(--dropp-muted)]">
                        {rfq.offers.length} {t.rfq.offersCountLabel}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {rfq.offers.map((offer) => (
                          <div
                            key={offer.offerId}
                            className={`p-3 rounded-xl border space-y-2 text-xs ${
                              offer.status === 'accepted'
                                ? 'border-[#FF5A1F]/60 bg-[#FF5A1F]/10'
                                : 'border-[var(--dropp-border)] bg-[var(--dropp-bg)]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 font-bold text-[var(--dropp-text)]">
                                {offer.shopName}
                                {offer.shopCertified && (
                                  <BadgeCheck className="w-3.5 h-3.5 text-[var(--dropp-accent)]" aria-hidden="true" />
                                )}
                              </span>
                              <span className="font-bold text-[var(--dropp-accent)] tabular-nums">
                                {formatFcfa(offer.unitPriceFcfa)} / {t.sheets.pcsUnit}
                              </span>
                            </div>
                            <p className="text-[var(--dropp-muted)]">{offer.message}</p>
                            <div className="flex items-center justify-between text-[11px] text-[var(--dropp-muted)]">
                              <span>
                                Total: {formatFcfa(offer.unitPriceFcfa * rfq.quantity)}
                              </span>
                              <span>{offer.deliveryDays}j</span>
                            </div>
                            {rfq.status === 'open' && (
                              <button
                                type="button"
                                onClick={() => {
                                  onAcceptOffer(rfq.rfqId, offer.offerId);
                                  onClose();
                                  onOpenCart();
                                }}
                                className="w-full min-h-[38px] rounded-lg bg-[#FF5A1F] hover:bg-[#E54E19] text-white font-bold"
                              >
                                {t.rfq.acceptOfferBtn}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isVendor && rfq.status === 'open' && (
                    <div className="pt-1">
                      {replyingRfqId === rfq.rfqId ? (
                        <form
                          onSubmit={(e) => handleReplySubmit(e, rfq.rfqId)}
                          className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--dropp-border)]"
                        >
                          <input
                            type="number"
                            value={offerPrice}
                            onChange={(e) => setOfferPrice(e.target.value)}
                            placeholder={t.rfq.offerPriceLabel}
                            className="min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)]"
                          />
                          <input
                            type="number"
                            value={offerDays}
                            onChange={(e) => setOfferDays(e.target.value)}
                            placeholder={t.rfq.offerDaysLabel}
                            className="min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)]"
                          />
                          <button
                            type="submit"
                            className="min-h-[40px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white text-xs font-bold"
                          >
                            {t.actions.submit}
                          </button>
                          <input
                            type="text"
                            value={offerMsg}
                            onChange={(e) => setOfferMsg(e.target.value)}
                            placeholder={t.rfq.offerMsgLabel}
                            className="sm:col-span-3 min-h-[40px] px-3 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-xs text-[var(--dropp-text)]"
                          />
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReplyingRfqId(rfq.rfqId)}
                          className="min-h-[38px] px-3.5 rounded-xl bg-[var(--dropp-surface-alt)] border border-[var(--dropp-border)] hover:border-[var(--dropp-border-strong)] text-xs font-semibold text-[var(--dropp-text)]"
                        >
                          {t.rfq.submitOfferBtn}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
