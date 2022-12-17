import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18next from '../shared/lang/i18next';
import Button from '@mui/material/Button';
import CurrencyNumberFormat from '../shared/components/CurrencyNumberFormat';
import { contentXL, contentXs, contentXXL, spacingL, spacingM, spacingS } from '../shared/styling/StylingConstants';
import styled from 'styled-components';
import { TextField } from '@mui/material';
import { Clear, Edit } from '@mui/icons-material';
import CurrencyFormat from '../shared/components/CurrencyFormat';
import { Payer } from '../core/models/ReceiptTracker/Payer';
import { useReceiptService } from '../core/services/ReceiptService';
import { useNavigate } from 'react-router-dom';

const Amount = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  font-family: monospace;
  font-size: ${spacingM}
`;

const AmountDue = styled(Amount)<{amount: number}>`
  color: ${props => props.amount >= 0 ? 'green' : 'red'};
`;

const TotalContainer = styled(Amount)`
  align-self: center;
  font-size: ${contentXs};
`;

const AlignEnd = styled.div`
  display: flex;
  justify-content: flex-end;
  margin: ${spacingS};
`;

const PayerTotals = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: ${spacingM};
  > * {
    width: 100%;
  }
`;

const PayersContainer = styled.div`
  display: flex;
  flex-direction: row;
`;

const PayerColumn = styled.div`
  display: flex;
  flex-direction: column;
  box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
  border-radius: ${spacingM};
  width: ${contentXL};
  height: ${contentXXL};
  padding: ${spacingL};
  margin: ${spacingM};
  border: 1px solid;
`;

const Receipt = styled.div`
  display: flex;
  flex-direction: row;
  margin: ${spacingS};
`;

const ReceiptActions = styled.div`
  display: flex;
  flex-direction: column;
  margin: ${spacingS};
`;
const ReceiptColumn = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: ${spacingM};
  margin: ${spacingM};
  align-items: center;
  justify-content: center;
  box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
  border-radius: ${spacingM};
  border: 2px dashed;
`;

export function ReceiptTracker() {
  const { t } = useTranslation('translation', { i18n: i18next });
  const receiptService = useReceiptService();
  const navigate = useNavigate();
  const [total, setTotal] = useState(0);
  const [players, setPayers] = useState(new Map<number, Payer>);
  
  const refreshPlayers = async () => {
    const data = await receiptService.getPayers();
    setPayers(data);
  };

  const refreshPlayer = async (key: number) => {
    const data = await receiptService.getPayer(key);
    if (data === undefined) {
      return;
    }
    const playersCopy = new Map(players);
    playersCopy.set(key, data);
    setPayers(playersCopy);
  };

  useEffect(() => {
    refreshPlayers();
  }, []);

  useEffect(() => {
    const playersCopy = new Map(players);
    Array.from(playersCopy).forEach(([key, player]) => {
      player.amountDue = getAmountDue(key);
    });
    setPayers(playersCopy);
    recalculateTotal();
  }, [players]);

  const _addColumn = () => {
    const newPayer = { name: 'Payer', receipts: [], amountDue: 0};
    receiptService.addPayer(newPayer);
    refreshPlayers();
  };

  const _addReceipt = (playerId: number) => {
    receiptService.addReceipt(playerId);
    refreshPlayer(playerId);
  };

  const handleReceiptChange = (playerId: number, receiptId: number, newTotal: number) => {
    receiptService.updateReceiptTotal(playerId, receiptId, newTotal);
    refreshPlayer(playerId);
  };

  const _removeReceipt = (playerId: number, receiptId: number) => {
    receiptService.removeReceipt(playerId, receiptId);
    refreshPlayer(playerId);
  };

  const handleNameChange = (key: number, name : string) => {
    receiptService.changePlayerName(key, name);
    refreshPlayers();
  };

  const getAmountDue = (key: number) : number => {
    const player = players.get(key);
    if (player === undefined) {
      return -1;
    }
    const totalPaid = player.receipts.reduce((acc, receipt) => acc + receipt.total, 0);
    const totalForEach = total / players.size;
    return totalPaid - totalForEach;
  };

  const recalculateTotal = () : void => {
    const newTotal = Array.from(players)
      .map(([_, player]) => player.receipts.reduce((acc, curr) => acc + curr.total, 0))
      .reduce((acc, curr) => acc + curr, 0);
    setTotal(newTotal);
  };

  const handleEditReceipt = (receiptId: number) => {
    navigate(`/receiptTracker/receipt/${receiptId}`);
  };

  return <React.Suspense fallback="loading...">
    <TotalContainer>
      <span> Total :</span>
      <CurrencyFormat value={total}/> 
    </TotalContainer>
    <AlignEnd>
      <Button variant="contained" color="secondary" onClick={() => _addColumn()}> 
        {t('receipt.addPerson')}
      </Button>
    </AlignEnd>
    <PayersContainer>
      {Array.from(players).map(([key, value]) => 
        <PayerColumn key={key}>
          <TextField
            id={`playerName${key}`}
            key={key}
            label={t('receipt.playerName')}
            variant="outlined"
            value={value.name}
            onChange={(e) => handleNameChange(key, e.target.value)}
          />
          { value.receipts.length > 0 && 
            <ReceiptColumn>
              {value.receipts.map((receipt, index) => 
                <Receipt key={receipt.id}>
                  <TextField 
                    id={`receipt${key}-${receipt.id}`}
                    key={receipt.id}
                    label={receipt.name}
                    variant="outlined"
                    value={receipt.total}
                    InputProps={{ inputComponent: CurrencyNumberFormat as any }}
                    onChange={(e) => handleReceiptChange(key, receipt.id, parseFloat(e.target.value))}
                  />
                  <ReceiptActions>
                    <Edit onClick={() => handleEditReceipt(receipt.id)}/>
                    <Clear onClick={() => _removeReceipt(key, receipt.id)}/>
                  </ReceiptActions>
                </Receipt>
              )}
            </ReceiptColumn>
          }
          <AlignEnd>
            <Button variant="contained" color="secondary" onClick={() => _addReceipt(key)}>
              <span>{t('receipt.addReceipt')}</span>
            </Button>
          </AlignEnd>
          <PayerTotals>
            <Amount>
              {t('receipt.contributedAmount')}: 
              <AlignEnd>
                <CurrencyFormat value={value.receipts.length > 0 ? 
                  value.receipts.reduce((acc, val) => acc + val.total, 0) : 0} />
              </AlignEnd>
            </Amount>
            -
            <Amount style={{color: 'red'}}>{t('receipt.contributionAmount')}: 
              <AlignEnd> <CurrencyFormat value={total / players.size} /> </AlignEnd> 
            </Amount>
            --------------------------------
            <AmountDue amount={value.amountDue}> 
              {t('receipt.amountDue')}:
              <AlignEnd>
                {value.amountDue > 0 && '+'}
                <CurrencyFormat value={value.amountDue}/>
              </AlignEnd>
            </AmountDue>
          </PayerTotals>
        </PayerColumn>
      )}
    </PayersContainer>
  </React.Suspense>;
}
