"use client";

import { useState } from "react";
import { todayIso } from "@/lib/format";
import { orderDraftTemplate } from "@/lib/orders";
import type { Client, Modal } from "@/lib/types";

export type ClientSettingsDraft = { id: string; name: string; store: string; color: string };

export function useWorkspaceDialogs() {
  const [modal, setModal] = useState<Modal>(null);

  const [clientName, setClientName] = useState("");
  const [clientBusy, setClientBusy] = useState(false);

  const [productName, setProductName] = useState("");
  const [productSourceUrl, setProductSourceUrl] = useState("");
  const [productEbayUrl, setProductEbayUrl] = useState("");
  const [productSource, setProductSource] = useState("AliExpress");
  const [supplierCost, setSupplierCost] = useState("");
  const [ebayPrice, setEbayPrice] = useState("");

  const [listingTitle, setListingTitle] = useState("");
  const [listingSourceUrl, setListingSourceUrl] = useState("");
  const [listingListedDate, setListingListedDate] = useState("");

  const [orderDraft, setOrderDraft] = useState<Record<string, string>>(orderDraftTemplate());

  const [importName, setImportName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, any>>({});

  const [settingsDraft, setSettingsDraft] = useState<ClientSettingsDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const closeModal = () => setModal(null);
  const openAddClient = () => setModal("client");

  const openImport = () => {
    setImportName("");
    setImportFile(null);
    setModal("import");
  };

  const openProduct = () => setModal("product");

  const openListing = () => {
    setListingListedDate(todayIso());
    setModal("listing");
  };

  const openOrder = () => {
    setOrderDraft(orderDraftTemplate());
    setModal("order");
  };

  const openClientSettings = (client: Client) => {
    setSettingsDraft({ id: client.id, name: client.name, store: client.store, color: client.color });
    setModal("clientSettings");
  };

  const requestDeleteClient = (client: Client) => {
    setDeleteTarget(client);
    setModal("deleteClient");
  };

  return {
    modal,
    setModal,
    closeModal,

    clientName,
    setClientName,
    clientBusy,
    setClientBusy,

    productName,
    setProductName,
    productSourceUrl,
    setProductSourceUrl,
    productEbayUrl,
    setProductEbayUrl,
    productSource,
    setProductSource,
    supplierCost,
    setSupplierCost,
    ebayPrice,
    setEbayPrice,

    listingTitle,
    setListingTitle,
    listingSourceUrl,
    setListingSourceUrl,
    listingListedDate,
    setListingListedDate,

    orderDraft,
    setOrderDraft,

    importName,
    setImportName,
    importFile,
    setImportFile,
    importBusy,
    setImportBusy,

    editingRow,
    setEditingRow,
    editDraft,
    setEditDraft,

    settingsDraft,
    setSettingsDraft,
    deleteTarget,
    setDeleteTarget,
    deleteBusy,
    setDeleteBusy,

    openAddClient,
    openImport,
    openProduct,
    openListing,
    openOrder,
    openClientSettings,
    requestDeleteClient,
  };
}

export type WorkspaceDialogsApi = ReturnType<typeof useWorkspaceDialogs>;
